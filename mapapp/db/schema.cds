namespace hello;

entity ApiLogs {
  key logID     : UUID;
  functionName  : String(100);
  calledAt      : DateTime;
}
