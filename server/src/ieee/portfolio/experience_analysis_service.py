import asyncio
from ieee.portfolio.analysis_view import AnalysisView
from ieee.portfolio.duplicate_search_service import DuplicateSearchService
from ieee.portfolio.experience_extractor import ExperienceExtractor


class ExperienceAnalysisService:
    """Analyzes a new experience: extracts the fields and finds possible duplicates. It stores nothing."""

    def __init__(self, extractor: ExperienceExtractor, duplicates: DuplicateSearchService):
        self.extractor = extractor
        self.duplicates = duplicates

    async def analyze(self, owner: str, text: str) -> AnalysisView:
        fields = await self.extractor.extract(text)
        matches = await asyncio.to_thread(self.duplicates.find, owner, fields)
        return AnalysisView(fields=fields, duplicates=matches)
