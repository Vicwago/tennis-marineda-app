"""Convierte los manuales HTML de docs/ a PDF (Playwright + Chromium)."""
import pathlib
from playwright.sync_api import sync_playwright

docs = pathlib.Path(__file__).parent
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    for name in ("manual-jugador", "manual-admin"):
        page.goto((docs / f"{name}.html").as_uri())
        page.pdf(path=str(docs / f"{name}.pdf"), format="A4", print_background=True,
                 margin={"top": "16mm", "bottom": "16mm", "left": "15mm", "right": "15mm"})
        print("OK", name + ".pdf")
    browser.close()
