export type DbGame = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS';
  cover: string;
  color: 'cyan' | 'magenta' | 'yellow' | 'green';
  created_at: string;
};

export type DbScore = {
  id: string;
  game_id: string;
  player_name: string;
  score: number;
  achieved_at: string;
};
