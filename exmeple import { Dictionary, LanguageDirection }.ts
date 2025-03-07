import initSqlJs, { Database } from 'sql.js';
import { Dictionary, LanguageDirection } from './example'; // Assurez-vous que le chemin est correct

export class DictionaryService {
  private db: Database | null = null;
  private fallbackDictionary: Dictionary = {
    "bonjour": "bonjou",
    "merci": "mèsi"
  };

  async loadDatabase(): Promise<void> {
    try {
      const SQL = await initSqlJs({ locateFile: file => `https://sql.js.org/dist/${file}` });
      const response = await fetch('https://github.com/krysgithub/kreolysev1/raw/refs/heads/main/dictionnaire.db');
      if (!response.ok) {
        throw new Error(`Erreur lors du téléchargement de la DB: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      this.db = new SQL.Database(new Uint8Array(buffer));
      console.log('Base de données chargée avec succès');
    } catch (error) {
      console.error('Erreur lors du chargement de la base de données:', error);
      this.db = null;
    }
  }

  translate(word: string, direction: LanguageDirection): string {
    if (!word) {
      return 'Mot vide';
    }

    if (this.db) {
      try {
        const query = direction === LanguageDirection.FR_TO_CR 
          ? "SELECT traductions FROM dictionnaire WHERE LOWER(mot) = ?" 
          : "SELECT mot FROM dictionnaire WHERE LOWER(traductions) = ?";
        const stmt = this.db.prepare(query);
        stmt.bind([word.toLowerCase()]);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          const result = direction === LanguageDirection.FR_TO_CR 
            ? row['traductions'] 
            : row['mot'];
          stmt.free();
          return result;
        } else {
          stmt.free();
          console.warn(`Aucun résultat trouvé pour le mot: ${word}`);
          return this.fallbackTranslate(word, direction);
        }
      } catch (error) {
        console.error("Erreur lors de l'exécution de la requête SQL:", error);
        return this.fallbackTranslate(word, direction);
      }
    } else {
      return this.fallbackTranslate(word, direction);
    }
  }

  private fallbackTranslate(word: string, direction: LanguageDirection): string {
    const key = word.toLowerCase();
    if (this.fallbackDictionary[key]) {
      return this.fallbackDictionary[key];
    } else {
      return `Traduction non trouvée pour ${word}`;
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
