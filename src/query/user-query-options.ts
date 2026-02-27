import { queryOptions } from '@tanstack/react-query';
import { get } from '@/auth/fanfou-client';
import type { FanfouUser } from '@/types/fanfou';

export const userQueryKeys = {
  account: (userId: string) => ['account', userId] as const,
  profile: (userId: string) => ['profile', 'user', userId] as const,
  headerOwner: (userId: string) => ['header-owner', userId] as const,
};

const fetchUserById = async (userId: string): Promise<FanfouUser> =>
  get('/users/show', {
    id: userId,
  }) as Promise<FanfouUser>;

export const accountUserQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: userQueryKeys.account(userId),
    queryFn: () => fetchUserById(userId),
  });

export const profileUserQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: userQueryKeys.profile(userId),
    queryFn: () => fetchUserById(userId),
  });

export const headerOwnerUserQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: userQueryKeys.headerOwner(userId),
    queryFn: () => fetchUserById(userId),
  });
