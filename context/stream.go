package context

import "context"

var streamsInContext = "fossilStreams"

func WithStreams(ctx context.Context, streams []string) context.Context {
	return context.WithValue(ctx, streamsInContext, streams)
}

func StreamsFromContext(ctx context.Context) []string {
	c := ctx.Value(streamsInContext)
	if c != nil {
		if s, ok := c.([]string); ok {
			return s
		}
	}

	return []string{}
}
