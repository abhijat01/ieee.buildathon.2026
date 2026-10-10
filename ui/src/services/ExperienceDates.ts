/** Shows the stored dates (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`) in a short form. */
export class ExperienceDates {
  private static readonly months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  static month(value: string | null): string {
    if (!value) return '';
    const [year, month] = value.split('-');
    return month ? `${ExperienceDates.months[Number(month) - 1] ?? month} ${year}` : year;
  }

  static period(start: string | null, end: string | null): string {
    if (!start && !end) return 'No dates';
    return `${ExperienceDates.month(start) || '?'} – ${ExperienceDates.month(end) || 'Present'}`;
  }

  /** Shows the day of the last save, for example `Sep 12`. It adds the year when the year is not the current year. */
  static saved(timestamp: string, now: Date = new Date()): string {
    const day = new Date(timestamp);
    if (day.toDateString() === now.toDateString()) return 'today';
    const year = day.getFullYear() === now.getFullYear() ? '' : `, ${day.getFullYear()}`;
    return `${ExperienceDates.months[day.getMonth()]} ${day.getDate()}${year}`;
  }
}
