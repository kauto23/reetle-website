export interface User {
  id: string;
  username: string | null;
  hasCompletedAssessment: boolean;
  cefrLevel: string | null;
  appleUserId: string | null;
  googleUserId: string | null;
  email: string | null;
  familiarLanguage: string | null;
  targetLanguage: string | null;
  deviceToken: string | null;
  hasPremium: boolean;
}

export interface TargetLanguage {
  code: string;
  name: string;
  native_name: string;
  flag: string;
}
