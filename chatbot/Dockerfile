# 1. Utiliser une image Python stable
FROM python:3.10-slim

# 2. Définir le dossier de travail dans le conteneur
WORKDIR /app

# 3. Installer les dépendances système nécessaires pour Chroma et la compilation
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 4. Copier le fichier des dépendances Python
COPY requirements.txt .

# 5. Installer les librairies (langchain, chroma, fastapi, etc.)
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copier tout le reste du code du chatbot
COPY . .

# 7. Exposer le port 8000 (celui configuré dans ton docker-compose)
EXPOSE 8000

# 8. Commande pour lancer ton chatbot (Exemple si c'est du FastAPI avec uvicorn)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]