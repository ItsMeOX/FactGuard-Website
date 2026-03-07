// post for the detailed page
export type Post = {
  title: string;
  sourceType: ClaimSource;
  sourceUrl: string;
  time: Date;
  // more...
};

// type for home page popular claim (summaries of popular posts)
export type PopularClaim = {
  title: string;
  imgUrl: string;
  posts: Post[];
};

export enum ClaimSource {
  TIKTOK = 'TIKTOK',
  X = 'X',
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  REDDIT = 'REDDIT',
  WEBPAGE = 'WEBPAGE'
}
