"""
Face Recognition Module using DeepFace
Handles face detection, embedding generation, and face comparison
"""
import cv2
import numpy as np
from PIL import Image
from deepface import DeepFace
import logging
from typing import List, Dict, Any, Optional, Tuple
import asyncio
from concurrent.futures import ThreadPoolExecutor

from config import config

logger = logging.getLogger(__name__)

# Thread pool for CPU-intensive tasks
executor = ThreadPoolExecutor(max_workers=config.MAX_WORKERS)


class FaceRecognitionService:
    """Service for face recognition operations"""
    
    def __init__(self):
        self.model_name = config.FACE_RECOGNITION_MODEL
        self.detector_backend = config.FACE_DETECTOR_BACKEND
        self.align = config.FACE_ALIGN
        self.enforce_detection = config.ENFORCE_DETECTION
        
    def _preprocess_image(self, image_array: np.ndarray) -> np.ndarray:
        """Preprocess image for face detection"""
        # Convert RGB to BGR if needed
        if len(image_array.shape) == 3 and image_array.shape[2] == 3:
            # Assuming RGB, convert to BGR for OpenCV
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        return image_array
    
    def generate_embedding_sync(self, image_array: np.ndarray) -> Tuple[Optional[List[float]], int, Optional[Dict]]:
        """Generate face embedding synchronously"""
        try:
            # Preprocess image
            processed_img = self._preprocess_image(image_array)
            
            # Generate embedding using DeepFace
            embedding_objs = DeepFace.represent(
                img_path=processed_img,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=self.enforce_detection,
                align=self.align
            )
            
            if not embedding_objs or len(embedding_objs) == 0:
                return None, 0, {"error": "No face detected"}
            
            # Get the first face (most prominent)
            embedding = embedding_objs[0]["embedding"]
            face_area = embedding_objs[0].get("area", 0)
            face_region = embedding_objs[0].get("region", {})
            
            return embedding, len(embedding_objs), {
                "face_area": face_area,
                "face_region": face_region
            }
            
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            return None, 0, {"error": str(e)}
    
    async def generate_embedding(self, image_array: np.ndarray) -> Dict[str, Any]:
        """Generate face embedding asynchronously"""
        loop = asyncio.get_event_loop()
        embedding, face_count, metadata = await loop.run_in_executor(
            executor, 
            self.generate_embedding_sync, 
            image_array
        )
        
        return {
            "success": embedding is not None,
            "embedding": embedding,
            "face_count": face_count,
            "embedding_dimension": len(embedding) if embedding else 0,
            "metadata": metadata
        }
    
    @staticmethod
    def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        a = np.array(a).flatten()
        b = np.array(b).flatten()
        
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
        
        similarity = dot_product / (norm_a * norm_b)
        # Convert from [-1, 1] to [0, 1] range
        return float((similarity + 1) / 2)
    
    @staticmethod
    def euclidean_distance(a: np.ndarray, b: np.ndarray) -> float:
        """Calculate Euclidean distance between two vectors"""
        a = np.array(a).flatten()
        b = np.array(b).flatten()
        return float(np.linalg.norm(a - b))
    
    def compare_faces(self, embedding1: List[float], embedding2: List[float]) -> Dict[str, Any]:
        """Compare two face embeddings"""
        emb1 = np.array(embedding1)
        emb2 = np.array(embedding2)
        
        if emb1.shape != emb2.shape:
            return {
                "success": False,
                "error": f"Dimension mismatch: {emb1.shape} vs {emb2.shape}"
            }
        
        similarity = self.cosine_similarity(emb1, emb2)
        distance = self.euclidean_distance(emb1, emb2)
        similarity_percent = similarity * 100
        
        return {
            "success": True,
            "similarity_score": round(similarity_percent, 2),
            "distance": round(distance, 4),
            "confidence": config.get_threshold_category(similarity_percent)
        }
    
    def find_best_matches(self, query_embedding: List[float], candidates: List[Dict]) -> List[Dict]:
        """Find best matching candidates"""
        results = []
        query_emb = np.array(query_embedding)
        
        for candidate in candidates:
            candidate_emb = np.array(candidate.get("embedding", []))
            
            if len(query_emb) != len(candidate_emb):
                logger.warning(f"Embedding dimension mismatch for candidate {candidate.get('id')}")
                continue
            
            similarity = self.cosine_similarity(query_emb, candidate_emb)
            similarity_percent = similarity * 100
            
            results.append({
                "id": candidate["id"],
                "score": round(similarity_percent, 2),
                "name": candidate.get("name", "Unknown"),
                "confidence": config.get_threshold_category(similarity_percent),
                **{k: v for k, v in candidate.items() if k not in ["id", "embedding", "name"]}
            })
        
        # Sort by score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        
        return results


# Create singleton instance
face_recognition_service = FaceRecognitionService()