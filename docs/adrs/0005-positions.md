# ADR 5: Position

## Context

We are confusing ourselves with the concept of "position" within the stream.
This document clarifies.

## Concepts

- **Event position.**
  This is the position of a given event within the stream, as an contiguous and increasing by one sequence,
  starting with `0`.

- **Stream position.**
  This is the position of the head, where events would be written. An empty stream
  position is `0`, a stream with a single event is `1`, etc... In other words, a stream position
  is the number of events it has in it.

- **Expected position.**
  When writing to a stream, we can specify the expected position of the stream as it is _before_ writing
  the provided event(s).
