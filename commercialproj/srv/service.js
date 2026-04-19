const cds = require('@sap/cds');
const { SELECT, UPSERT } = cds.ql;

module.exports = cds.service.impl(async function () {

  const s4 = await cds.connect.to('API_BUSINESS_PARTNER');
  const db = await cds.connect.to('db');

  const { LocalEmailAddress, Users, ExternalEmailAddress } = this.entities;

  this.on('READ', ExternalEmailAddress, async (req) => {
    return s4.run(req.query);
  });

  this.on('READ', Users, async (req) => {
  // Step 1: Get users from DB
  const users = await db.run(req.query);

  if (!users || users.length === 0) return users;

  // Step 2: Enrich each user with email details from S4
  for (const user of users) {
    if (user.email && user.email !== 'null') {
      try {
        const emailData = await s4.run(
          SELECT.one.from(ExternalEmailAddress)
            .where({ AddressID: user.email })
        );
        user.emailAddress = emailData?.EmailAddress || "";
        user.isDefault = emailData?.IsDefaultEmailAddress || false;
      } catch (err) {
        console.error(`Failed to fetch email for ${user.userId}:`, err.message);
        user.emailAddress = "";
      }
    }
  }

  return users;
});

  this.on('READ', LocalEmailAddress, async (req) => {  // fixed
    return db.run(req.query);
  });

  this.on('GetUserWithEmail', async (req) => {
    const { userId } = req.data;

    const user = await SELECT.one.from(Users).where({ userId });
    if (!user) return req.error(404, "User not found");

    const emailData = await s4.run(
      SELECT.one.from(ExternalEmailAddress)
        .where({ AddressID: user.email })
    );

    return {
      userId: user.userId,
      name: user.name,
      email: user.email,
      emailAddress: emailData?.EmailAddress || ""
    };
  });

  this.on('TransferData', async (req) => {
    try {
      const fetchedData = await s4.run(
        SELECT.from(ExternalEmailAddress).limit(100)
      );

      console.log("Fetched records:", fetchedData.length);

      if (!fetchedData || fetchedData.length === 0) {
        return "No data fetched from S4";
      }

      const mapped = fetchedData.map(item => ({
        AddressID:             item.AddressID || "",
        Person:                item.Person || "",
        OrdinalNumber:         item.OrdinalNumber || "",
        EmailAddress:          item.EmailAddress || "",
        IsDefaultEmailAddress: item.IsDefaultEmailAddress || false
      }));

      await UPSERT.into(LocalEmailAddress).entries(mapped);

      return `Success: ${mapped.length} records transferred to HANA`;

    } catch (error) {
      console.error("TransferData Error:", error.message);
      return `Failed: ${error.message}`;
    }
  });

});