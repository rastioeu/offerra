/** Typy pre admin obrazovku. Všetko chodí cez SECURITY DEFINER funkcie. */
export type AdminStats = {
  inzeraty_aktivne: number;
  inzeraty_spolu: number;
  ponuky: number;
  dopyty: number;
  pouzivatelia: number;
  zablokovani: number;
  nahlasenia_otvorene: number;
};

export type AdminUser = {
  id: string;
  nickname: string;
  email: string;
  role: 'USER' | 'ADMIN';
  is_blocked: boolean;
  inzeraty: number;
  created_at: string;
  /** Kedy správca účet overil. `null` = neoverený. */
  verified_at: string | null;
  /** Čo presne bolo overené — zobrazuje sa ľuďom pri odznaku. */
  verified_note: string | null;
};

export type ReportRow = {
  id: string;
  reporter_id: string;
  target_type: 'PROPERTY' | 'USER' | 'OFFER';
  target_id: string;
  reason: string;
  note: string | null;
  status: string;
  created_at: string;
};
