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
}
