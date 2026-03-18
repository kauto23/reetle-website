export interface GrammarNote {
  label: string;
  title: string;
  source_word: string;
  why: string;
}

export interface Translation {
  text: string;
  explanation: string;
  id: number;
  status: string | null;
  grammar_notes: GrammarNote[];
}
