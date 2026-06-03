from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    DATABASE_URL: str = "postgresql://fuzzy:fuzzy_secret@localhost:5432/fuzzy_topsis"
    SECRET_KEY: str = "change_me_in_production"
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Fuzzy scale defaults
    DEFAULT_WEIGHT_SCALE: str = "standard_weight"
    DEFAULT_RATING_SCALE: str = "standard_rating"


settings = Settings()
