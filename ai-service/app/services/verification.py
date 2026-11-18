"""
Resolution Verification Service Stub
Sprint 2: Compares before/after images when civic workers mark an issue resolved.
"""

from typing import Dict, Any

class ResolutionVerifier:
    def __init__(self):
        self.is_loaded = False

    async def verify_resolution(self, original_image_path: str, resolved_image_path: str) -> Dict[str, Any]:
        return {
            "status": "not_implemented",
            "message": "Resolution verification scheduled for Sprint 2"
        }
