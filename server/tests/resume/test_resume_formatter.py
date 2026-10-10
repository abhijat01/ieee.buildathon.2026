from ieee.resume.resume_formatter import ResumeFormatter
from .resume_samples import item_view, keyword_check, tailored, work_view

KEYWORDS = keyword_check(in_resume=["Python", "Kubernetes"], in_excluded_items=["Airflow"], not_in_portfolio=["AWS"])
ITEMS = [item_view("p1"), work_view("w1"),
         item_view("p2", title="Sales data pipeline", start_date="2021-06", end_date=None, skills=["python", "Airflow"]),
         work_view("w2", title="Software Engineer", company=None, start_date="2016", end_date="2018-12-31", skills=["SQL"])]
TEXTS = {"p1": "- Built the pipeline with Python", "w1": "- Moved 12 services to Kubernetes",
         "p2": "- Built a nightly pipeline", "w2": "- Built SQL reports"}


def test_the_markdown_has_the_standard_headings_in_the_correct_order_and_plain_dates():
    resume = ResumeFormatter().format("Abhijat", tailored(TEXTS, "Software engineer with experience in Python."),
                                      ITEMS, KEYWORDS)
    assert resume.markdown == (
        "# Abhijat\n[Email] | [Phone] | [City] | [LinkedIn]\n\n"
        "## Summary\n\nSoftware engineer with experience in Python.\n\n"
        "## Skills\n\nPython, Kubernetes, React, Java, Airflow, SQL\n\n"
        "## Work Experience\n\n"
        "### Senior Software Engineer | Northwind Labs\nJan 2019 - May 2021\n\n- Moved 12 services to Kubernetes\n\n"
        "### Software Engineer\n2016 - Dec 2018\n\n- Built SQL reports\n\n"
        "## Projects\n\n"
        "### Atlas analytics dashboard | Acme Corp\nMar 2022 - Jun 2023\n\n- Built the pipeline with Python\n\n"
        "### Sales data pipeline | Acme Corp\nJun 2021 - Present\n\n- Built a nightly pipeline\n")
    assert resume.file_name == "resume-abhijat.md"
    assert resume.format_checks == [
        "Standard section headings: Summary, Skills, Work Experience, Projects",
        "One column. No tables, images, or text boxes", "Plain bullets and plain dates",
        "Job keywords in the Skills section and in the descriptions"]


def test_the_resume_has_only_the_included_items_and_omits_an_empty_section():
    resume = ResumeFormatter().format("Abhijat", tailored({"p1": TEXTS["p1"]}), [ITEMS[0]], keyword_check())
    assert "## Projects" in resume.markdown and "Atlas analytics dashboard" in resume.markdown
    assert "## Work Experience" not in resume.markdown and "Northwind" not in resume.markdown
    assert "Job keywords in the Skills section and in the descriptions" not in resume.format_checks
    no_skills = ResumeFormatter().format("Abhijat", tailored({"p1": TEXTS["p1"]}), [item_view("p1", skills=[])],
                                         keyword_check())
    assert "## Skills" not in no_skills.markdown


def test_the_skills_line_has_no_repeated_skill_and_no_unsupported_keyword():
    keywords = keyword_check(in_resume=["React", "Python"], not_in_portfolio=["AWS", "Java"])
    resume = ResumeFormatter().format("Abhijat", tailored({"p1": TEXTS["p1"], "w1": TEXTS["w1"]}), ITEMS[:2], keywords)
    assert "## Skills\n\nReact, Python, Kubernetes\n" in resume.markdown


def test_tables_images_html_and_headings_are_removed_from_the_ai_text():
    text = ("## Results\n| Tool | Years |\n|---|---|\n| Python | 5 |\nTool | Years\n--- | ---\n"
            "* Built the <b>pipeline</b> ![chart](https://example.test/a.png)\n\n\n+ Led 4 engineers<br/>\n---\n"
            "<script>alert(1)</script>")
    resume = ResumeFormatter().format("Abhi <i>jat</i>\n# Name", tailored({"p1": text}, "## Summary\n- Engineer <b>with</b> Python."),
                                      [item_view("p1", title="Atlas | <img src=x>")], keyword_check())
    assert resume.descriptions["p1"] == "Results\nTool | Years\n- Built the pipeline\n\n- Led 4 engineers\nalert(1)"
    assert resume.markdown.startswith("# Abhi jat Name\n[Email]")
    assert "## Summary\n\nSummary Engineer with Python.\n" in resume.markdown
    assert "### Atlas | | Acme Corp" in resume.markdown
    for mark in ("<", "![", "|---", "--- |", "\n---", "## Results"):
        assert mark not in resume.markdown
    assert [line for line in resume.markdown.splitlines() if line.startswith("## ")] == ["## Summary", "## Skills", "## Projects"]


def test_a_number_with_a_less_than_or_greater_than_sign_stays_unchanged():
    text = "- Cut the load time to <5 s for >40 tables"
    resume = ResumeFormatter().format("Abhijat", tailored({"p1": text}), [ITEMS[0]], keyword_check())
    assert resume.descriptions["p1"] == text and text in resume.markdown


def test_the_file_name_is_safe_for_each_member_name():
    formatter = ResumeFormatter()
    assert formatter.format("Ana María / O'Neil", tailored({"p1": "- Text"}), [ITEMS[0]], keyword_check()).file_name == "resume-ana-mar-a-o-neil.md"
    assert formatter.format("...", tailored({"p1": "- Text"}), [ITEMS[0]], keyword_check()).file_name == "resume.md"
