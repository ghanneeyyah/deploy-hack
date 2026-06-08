"""
Configuration settings for AI Microservice
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AIConfig:
    """AI Service Configuration"""
    
    # Model Settings
    FACE_RECOGNITION_MODEL = os.getenv("FACE_MODEL", "Facenet512")
    FACE_DETECTOR_BACKEND = os.getenv("FACE_DETECTOR", "retinaface")
    FACE_ALIGN = True
    ENFORCE_DETECTION = False
    
    # Matching Thresholds
    HIGH_CONFIDENCE_THRESHOLD = 0.85  # 85% and above = high confidence
    MEDIUM_CONFIDENCE_THRESHOLD = 0.65  # 65-85% = medium confidence
    LOW_CONFIDENCE_THRESHOLD = 0.40  # 40-65% = low confidence
    
    # NLP Settings
    SPACY_MODEL = "en_core_web_sm"
    
    # Entity Types to Extract
    ENTITY_TYPES = ["PERSON", "LOCATION", "DATE", "ORG", "GPE"]
    
    # Image Processing
    MAX_IMAGE_SIZE_MB = 5
    ALLOWED_IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp"]
    
    # Server Settings
    HOST = os.getenv("AI_HOST", "0.0.0.0")
    PORT = int(os.getenv("AI_PORT", 8000))
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    
    # Performance
    MAX_WORKERS = 4  # Thread pool size
    REQUEST_TIMEOUT = 30  # seconds
    
    @classmethod
    def get_threshold_category(cls, similarity_score):
        """Get confidence category based on similarity score"""
        if similarity_score >= cls.HIGH_CONFIDENCE_THRESHOLD * 100:
            return "high"
        elif similarity_score >= cls.MEDIUM_CONFIDENCE_THRESHOLD * 100:
            return "medium"
        elif similarity_score >= cls.LOW_CONFIDENCE_THRESHOLD * 100:
            return "low"
        else:
            return "very_low"
    
    @classmethod
    def validate_image_format(cls, filename):
        """Check if image format is allowed"""
        ext = filename.split('.')[-1].lower()
        return ext in cls.ALLOWED_IMAGE_FORMATS

config = AIConfig()