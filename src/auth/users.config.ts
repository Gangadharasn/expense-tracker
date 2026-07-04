export type UserRole = 'owner' | 'member';

export interface AppUser {
  username: string;
  displayName: string;
  role: UserRole;
  pin: string;
}

export function getAppUsers(): AppUser[] {
  return [
    {
      username: 'gangadhar',
      displayName: 'Gangadhar',
      role: 'owner',
      pin: process.env.GANGADHAR_PIN ?? '251998',
    },
    {
      username: 'kruthika',
      displayName: 'Kruthika',
      role: 'member',
      pin: process.env.KRUTHIKA_PIN ?? '311998',
    },
  ];
}
