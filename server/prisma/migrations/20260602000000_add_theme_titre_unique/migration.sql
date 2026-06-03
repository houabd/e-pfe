-- Identifier les IDs des doublons à supprimer (garder le plus récent par titre)
-- Supprimer d'abord les dépendances, puis les thèmes dupliqués

-- 1. Supprimer les choix étudiants liés aux doublons à supprimer
DELETE FROM "theme_choix"
WHERE theme_id IN (
  SELECT id FROM "themes" t
  WHERE EXISTS (
    SELECT 1 FROM "themes" t2
    WHERE t2.titre = t.titre
    AND t2.id <> t.id
    AND t2.created_at >= t.created_at
    AND t2.id > t.id
  )
);

-- 2. Supprimer les spécialités liées aux doublons à supprimer
DELETE FROM "theme_specialites"
WHERE theme_id IN (
  SELECT id FROM "themes" t
  WHERE EXISTS (
    SELECT 1 FROM "themes" t2
    WHERE t2.titre = t.titre
    AND t2.id <> t.id
    AND t2.created_at >= t.created_at
    AND t2.id > t.id
  )
);

-- 3. Supprimer les thèmes dupliqués (garder le plus récent / plus grand id)
DELETE FROM "themes"
WHERE id IN (
  SELECT id FROM "themes" t
  WHERE EXISTS (
    SELECT 1 FROM "themes" t2
    WHERE t2.titre = t.titre
    AND t2.id <> t.id
    AND t2.created_at >= t.created_at
    AND t2.id > t.id
  )
);

-- 4. Créer l'index unique
CREATE UNIQUE INDEX "themes_titre_key" ON "themes"("titre");
