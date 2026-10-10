---
name: resume2pdf
description: Convert a resume in Markdown format to LaTeX and a polished PDF. Takes the path to the Markdown resume file, writes the LaTeX files to a folder named <resume-file>-tex, reviews the PDF visually for quality and readability, and opens the final PDF. Use when the user asks to convert a Markdown resume to LaTeX or PDF.
argument-hint: <path-to-resume.md>
---

# Convert a Markdown resume to PDF

The argument is the path to a resume file in Markdown format.
If the argument is missing or the file does not exist, ask the user for the path. Then stop.

## Rules

- Do not change the Markdown file.
- Do not invent facts. Do not add employers, dates, titles, skills, or numbers that the Markdown file does not contain.
- Keep every fact from the Markdown file, unless the user tells you to remove it.
- Write the LaTeX by hand. Do not use the pandoc default template, because its layout is not a resume layout.

## Step 1 · Read the resume

1. Read the full Markdown file.
2. Identify the sections: name, contact details, summary, experience, education, skills, and others.
3. Identify the role that the resume targets. Use the summary and the most recent job.

## Step 2 · Create the output folder

Create the folder next to the Markdown file.
The folder name is the file name without the extension, plus `-tex`.

Example: `docs/jane-doe.md` gives `docs/jane-doe-tex/`.

If the folder exists, use it again and replace the files in it.

Write these files:

- `resume.tex` — the document content.
- `resume.cls` — the layout: page, fonts, colors, section and entry commands.

Keep the layout in `resume.cls` and the content in `resume.tex`.

## Step 3 · Write the LaTeX

**Layout**

- Use A4 or US Letter paper to agree with the country in the resume. Use US Letter if you are not sure.
- Use one column. Applicant tracking systems read one column correctly.
- Use margins of 0.6 to 0.8 inches and a body font of 10 to 11 points.
- Use `fontspec` with a clean font that the system has. Find the fonts with `fc-list`.
- Use one accent color, and use it only for the name, the section headings, and the links.
- Put the name at the top in large text. Put the contact details on one line below it.
- Put the job title and the employer on the left. Put the dates on the right, aligned to the margin.
- Use `hyperref` for the email address and the links. Hide the link borders.
- Set the PDF title and author metadata.
- Do not use photographs, icons that need extra packages, tables for layout, or skill bars.

**Content**

- Put the most important section first. For most resumes, that is the experience.
- Start each bullet with a strong past-tense verb. Use the present tense for the current job.
- Put the result first in a bullet when the Markdown file gives a number.
- Keep each bullet to one or two lines.
- Remove filler words and repeated words. Do not change the meaning.
- Use the same format for all dates, for example `Jan 2022 – Mar 2024`.
- Escape the LaTeX special characters: `& % $ # _ { } ~ ^ \`.

**Length**

- Target one page for less than 10 years of experience. Target two pages at most.
- Do not leave a last page that is less than one third full. Adjust the spacing or tighten the wording.

## Step 4 · Compile

Run this command in the output folder:

```bash
latexmk -xelatex -interaction=nonstopmode -halt-on-error resume.tex
```

If the compile fails, read `resume.log`, correct the error, and compile again.
Correct each `Overfull \hbox` warning larger than 2pt.

## Step 5 · Review the PDF visually

1. Convert each page to an image:

   ```bash
   pdftoppm -png -r 110 resume.pdf review
   ```

2. Read each `review-*.png` file with the Read tool. Look at the image. Do not rely on the log only.
3. Examine the page against this checklist:

   **Layout**
   - No text goes into the margins or over other text.
   - The dates align on the right margin.
   - The spacing between sections is the same everywhere.
   - No section heading stays alone at the bottom of a page.
   - No entry breaks across two pages in a bad position.
   - The page is balanced. It has no large empty areas and is not too dense.

   **Readability**
   - A reader finds the name, the current job, and the top skills in 6 seconds.
   - The reading order is clear: heading, then job, then bullets.
   - The text size is easy to read. The accent color has good contrast.
   - No bullet is longer than two lines.

   **Content**
   - The strongest results are near the top of each job.
   - Each bullet states an action and a result where the source gives one.
   - No spelling errors, no broken characters, and no Markdown symbols (`**`, `#`, `-`) remain.
   - Every fact agrees with the Markdown file.

4. Correct each problem in `resume.tex` or `resume.cls`. Compile again and examine the images again.
5. Repeat until the checklist passes. Do a maximum of four review rounds.
6. Delete the `review-*.png` files. Run `latexmk -c` to remove the auxiliary files.

## Step 6 · Open the PDF

```bash
open resume.pdf
```

On Linux, use `xdg-open resume.pdf`.

## Step 7 · Report

Tell the user:

- The path to the PDF and the path to the LaTeX folder.
- The number of pages.
- The wording changes that you made, as a short list.
- The weak points that only the user can correct, for example bullets without numbers.
