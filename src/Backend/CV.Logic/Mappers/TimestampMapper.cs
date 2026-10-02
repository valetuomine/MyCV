namespace CV.Logic.Mappers
{
    public static class TimestampMapper
    {
        private static readonly TimeZoneInfo FinlandTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Helsinki");

        public static DateTimeOffset ToFinlandTime(DateTime utcDateTime)
        {
            var utc = DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc);
            return TimeZoneInfo.ConvertTime(new DateTimeOffset(utc), FinlandTimeZone);
        }

        public static DateTimeOffset? ToFinlandTime(DateTime? utcDateTime)
        {
            return utcDateTime is DateTime value
                ? ToFinlandTime(value)
                : null;
        }
    }
}