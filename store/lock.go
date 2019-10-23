package store

import "context"

type DistributedLock interface {
	Lock(ctx context.Context, identifier string) error
	Release(identifier string) error
}
