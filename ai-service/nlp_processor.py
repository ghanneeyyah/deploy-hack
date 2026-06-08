"""
NLP Processing Module using spaCy
Handles named entity recognition and text processing
"""
import spacy
import logging
from typing import Dict, List
from datetime import datetime

from config import config

logger = logging.getLogger(__name__)


class NLPProcessor:
    """Service for NLP operations"""
    
    def __init__(self):
        self.model_name = config.SPACY_MODEL
        self.entity_types = config.ENTITY_TYPES
        
        # Load spaCy model
        try:
            self.nlp = spacy.load(self.model_name)
            logger.info(f"✅ Loaded spaCy model: {self.model_name}")
        except OSError:
            logger.info(f"📥 Downloading spaCy model: {self.model_name}")
            spacy.cli.download(self.model_name)
            self.nlp = spacy.load(self.model_name)
            logger.info(f"✅ Downloaded and loaded: {self.model_name}")
    
    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract named entities from text"""
        if not text or not text.strip():
            return {entity_type: [] for entity_type in self.entity_types}
        
        # Process text with spaCy
        doc = self.nlp(text.strip())
        
        # Initialize entities dictionary
        entities = {
            "PERSON": [],
            "LOCATION": [],
            "DATE": [],
            "ORGANIZATION": [],
            "GPE": []  # Geopolitical entities (countries, cities, states)
        }
        
        # Extract entities
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                entities["PERSON"].append(ent.text)
            elif ent.label_ == "LOC":
                entities["LOCATION"].append(ent.text)
            elif ent.label_ == "DATE":
                entities["DATE"].append(ent.text)
            elif ent.label_ == "ORG":
                entities["ORGANIZATION"].append(ent.text)
            elif ent.label_ == "GPE":
                entities["GPE"].append(ent.text)
        
        # Remove duplicates while preserving order
        for key in entities:
            entities[key] = list(dict.fromkeys(entities[key]))
        
        logger.info(f"Extracted entities: {sum(len(v) for v in entities.values())} total")
        
        return entities
    
    def extract_locations(self, text: str) -> List[str]:
        """Extract only location entities"""
        entities = self.extract_entities(text)
        locations = entities["LOCATION"] + entities["GPE"]
        return list(dict.fromkeys(locations))  # Remove duplicates
    
    def extract_dates(self, text: str) -> List[str]:
        """Extract date entities"""
        entities = self.extract_entities(text)
        return entities["DATE"]
    
    def extract_persons(self, text: str) -> List[str]:
        """Extract person name entities"""
        entities = self.extract_entities(text)
        return entities["PERSON"]
    
    def get_keywords(self, text: str, top_n: int = 10) -> List[str]:
        """Extract important keywords from text"""
        doc = self.nlp(text)
        
        # Extract nouns and proper nouns
        keywords = []
        for token in doc:
            if token.pos_ in ["NOUN", "PROPN", "ADJ"] and not token.is_stop:
                if len(token.text) > 2:  # Ignore very short words
                    keywords.append(token.text.lower())
        
        # Count frequency and get top N
        from collections import Counter
        keyword_counts = Counter(keywords)
        
        return [word for word, count in keyword_counts.most_common(top_n)]
    
    def extract_description_summary(self, description: str, max_length: int = 200) -> str:
        """Extract summary from description"""
        doc = self.nlp(description)
        
        # Get sentences
        sentences = list(doc.sents)
        
        if not sentences:
            return description[:max_length]
        
        # Take first few sentences as summary
        summary = " ".join([sent.text for sent in sentences[:3]])
        
        if len(summary) > max_length:
            summary = summary[:max_length] + "..."
        
        return summary
    
    def process_sighting_description(self, description: str) -> Dict:
        """Comprehensive processing of a sighting description"""
        return {
            "entities": self.extract_entities(description),
            "locations": self.extract_locations(description),
            "dates": self.extract_dates(description),
            "persons_mentioned": self.extract_persons(description),
            "keywords": self.get_keywords(description, 10),
            "summary": self.extract_description_summary(description),
            "processed_at": datetime.now().isoformat()
        }


# Create singleton instance
nlp_processor = NLPProcessor()