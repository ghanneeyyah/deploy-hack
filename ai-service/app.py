from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import numpy as np
import cv2
from PIL import Image
import io
import logging
import uvicorn
from datetime import datetime
import asyncio
import time

# Import our modular components
from config import config
from face_recognition import face_recognition_service
from nlp_processor import nlp_processor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AI Microservice for Missing Persons Platform",
    description="Face recognition and NLP entity extraction service",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class CompareFacesRequest(BaseModel):
    embedding1: List[float]
    embedding2: List[float]

class CompareFacesResponse(BaseModel):
    success: bool
    similarity_score: float
    distance: float

class ExtractEntitiesRequest(BaseModel):
    text: str

class ExtractEntitiesResponse(BaseModel):
    success: bool
    entities: Dict[str, List[str]]
    processed_at: str

class FindBestMatchRequest(BaseModel):
    query_embedding: List[float]
    candidates: List[Dict[str, Any]]

class FindBestMatchResponse(BaseModel):
    success: bool
    matches: List[Dict[str, Any]]
    processing_time_ms: float

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    services: Dict[str, bool]


@app.get("/")
async def root():
    """Root endpoint - service information"""
    return {
        "service": "AI Microservice for Missing Persons Platform",
        "status": "running",
        "version": "1.0.0",
        "endpoints": [
            "/health",
            "/generate-embedding",
            "/compare-faces",
            "/extract-entities",
            "/find-best-match",
            "/batch-generate-embeddings",
            "/process-sighting-text"
        ],
        "models": {
            "face_recognition": config.FACE_RECOGNITION_MODEL,
            "face_detection": config.FACE_DETECTOR_BACKEND,
            "nlp": config.SPACY_MODEL
        },
        "thresholds": {
            "high_confidence": f"{config.HIGH_CONFIDENCE_THRESHOLD * 100}%",
            "medium_confidence": f"{config.MEDIUM_CONFIDENCE_THRESHOLD * 100}%",
            "low_confidence": f"{config.LOW_CONFIDENCE_THRESHOLD * 100}%"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    services = {
        "deepface": True,
        "spacy": True,
        "opencv": True
    }
    
    # Test spaCy
    try:
        _ = nlp_processor.nlp("test")
    except Exception as e:
        services["spacy"] = False
        logger.error(f"spaCy health check failed: {e}")
    
    # Test OpenCV
    try:
        cv2.imread = cv2.imread  # Just check if available
    except Exception as e:
        services["opencv"] = False
        logger.error(f"OpenCV health check failed: {e}")
    
    return HealthResponse(
        status="healthy" if all(services.values()) else "degraded",
        timestamp=datetime.now().isoformat(),
        services=services
    )


@app.post("/generate-embedding")
async def generate_embedding(image: UploadFile = File(...)):
    """
    Generate face embedding from uploaded image
    Returns 512-dimensional face embedding vector
    """
    try:
        # Validate file type
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image
        contents = await image.read()
        img = Image.open(io.BytesIO(contents))
        
        # Convert PIL to numpy array
        img_array = np.array(img)
        
        logger.info(f"Generating embedding for image: {image.filename}")
        
        # Generate embedding using our service
        result = await face_recognition_service.generate_embedding(img_array)
        
        return result
        
    except Exception as e:
        logger.error(f"Error generating embedding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")


@app.post("/compare-faces", response_model=CompareFacesResponse)
async def compare_faces(request: CompareFacesRequest):
    """
    Compare two face embeddings and return similarity score
    """
    try:
        result = face_recognition_service.compare_faces(
            request.embedding1,
            request.embedding2
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Comparison failed"))
        
        return CompareFacesResponse(
            success=True,
            similarity_score=result["similarity_score"],
            distance=result["distance"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing faces: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to compare faces: {str(e)}")


@app.post("/extract-entities", response_model=ExtractEntitiesResponse)
async def extract_entities(request: ExtractEntitiesRequest):
    """
    Extract named entities from text using spaCy NLP
    """
    try:
        text = request.text.strip()
        
        if not text:
            return ExtractEntitiesResponse(
                success=True,
                entities={
                    "PERSON": [],
                    "LOCATION": [],
                    "DATE": [],
                    "ORGANIZATION": [],
                    "GPE": []
                },
                processed_at=datetime.now().isoformat()
            )
        
        # Extract entities using our service
        entities = nlp_processor.extract_entities(text)
        
        logger.info(f"Extracted entities: {sum(len(v) for v in entities.values())} total")
        
        return ExtractEntitiesResponse(
            success=True,
            entities=entities,
            processed_at=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error extracting entities: {str(e)}")
        return ExtractEntitiesResponse(
            success=False,
            entities={
                "PERSON": [],
                "LOCATION": [],
                "DATE": [],
                "ORGANIZATION": [],
                "GPE": []
            },
            processed_at=datetime.now().isoformat()
        )


@app.post("/process-sighting-text")
async def process_sighting_text(request: ExtractEntitiesRequest):
    """
    Comprehensive processing of sighting description
    Returns entities, locations, dates, keywords, and summary
    """
    try:
        result = nlp_processor.process_sighting_description(request.text)
        
        return {
            "success": True,
            "data": result,
            "processed_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error processing sighting text: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "processed_at": datetime.now().isoformat()
        }


@app.post("/find-best-match", response_model=FindBestMatchResponse)
async def find_best_match(request: FindBestMatchRequest):
    """
    Find best matching candidate for a query embedding
    """
    start_time = time.time()
    
    try:
        matches = face_recognition_service.find_best_matches(
            request.query_embedding,
            request.candidates
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        logger.info(f"Found {len(matches)} matches in {processing_time:.2f}ms")
        
        return FindBestMatchResponse(
            success=True,
            matches=matches,
            processing_time_ms=round(processing_time, 2)
        )
        
    except Exception as e:
        logger.error(f"Error finding best match: {str(e)}")
        processing_time = (time.time() - start_time) * 1000
        return FindBestMatchResponse(
            success=False,
            matches=[],
            processing_time_ms=round(processing_time, 2)
        )


@app.post("/batch-generate-embeddings")
async def batch_generate_embeddings(files: List[UploadFile] = File(...)):
    """
    Generate embeddings for multiple images in batch
    """
    try:
        results = []
        
        for file in files:
            try:
                contents = await file.read()
                img = Image.open(io.BytesIO(contents))
                img_array = np.array(img)
                
                result = await face_recognition_service.generate_embedding(img_array)
                
                if result["success"]:
                    results.append({
                        "filename": file.filename,
                        "success": True,
                        "embedding": result["embedding"],
                        "face_count": result["face_count"],
                        "embedding_dimension": result["embedding_dimension"]
                    })
                else:
                    results.append({
                        "filename": file.filename,
                        "success": False,
                        "message": result.get("metadata", {}).get("error", "No face detected"),
                        "embedding": None
                    })
            except Exception as e:
                results.append({
                    "filename": file.filename,
                    "success": False,
                    "message": str(e),
                    "embedding": None
                })
        
        return {
            "success": True,
            "results": results,
            "total_processed": len(results),
            "successful": sum(1 for r in results if r["success"])
        }
        
    except Exception as e:
        logger.error(f"Error in batch processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch processing failed: {str(e)}")


@app.get("/extract-locations")
async def extract_locations(text: str):
    """Extract only location entities from text"""
    try:
        locations = nlp_processor.extract_locations(text)
        return {
            "success": True,
            "locations": locations,
            "count": len(locations)
        }
    except Exception as e:
        logger.error(f"Error extracting locations: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/extract-dates")
async def extract_dates(text: str):
    """Extract date entities from text"""
    try:
        dates = nlp_processor.extract_dates(text)
        return {
            "success": True,
            "dates": dates,
            "count": len(dates)
        }
    except Exception as e:
        logger.error(f"Error extracting dates: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/config-info")
async def get_config_info():
    """Get current AI service configuration"""
    return {
        "face_recognition_model": config.FACE_RECOGNITION_MODEL,
        "face_detector": config.FACE_DETECTOR_BACKEND,
        "spacy_model": config.SPACY_MODEL,
        "thresholds": {
            "high": config.HIGH_CONFIDENCE_THRESHOLD * 100,
            "medium": config.MEDIUM_CONFIDENCE_THRESHOLD * 100,
            "low": config.LOW_CONFIDENCE_THRESHOLD * 100
        },
        "max_workers": config.MAX_WORKERS,
        "allowed_image_formats": config.ALLOWED_IMAGE_FORMATS,
        "max_image_size_mb": config.MAX_IMAGE_SIZE_MB
    }


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=config.HOST,
        port=config.PORT,
        reload=config.DEBUG,
        log_level="info"
    )