# ADR 5: Position

## Context

We are confusing ourselves with the concept of "position" within the stream.
This document clarifies.

## Concepts

- **Event position.**
  This is the position of a given event within the stream, as an contiguous and increasing by one sequence,
  starting with `0`.

- **Stream position.**
  The stream position is the position of the head event. For example, it is `0` if it has a single event.
  If the stream is empty, its position is `-1`.

- **Expected position.**
  When writing to a stream, we can specify the expected position of the stream as it is _before_ writing
  the provided event(s). For example, expecting to write in an empty stream means the expected position is `-1`.

- **Starting position.**
  The (inclusive) position from which to read a stream from. It means that to start reading a stream from
  the beginning, the starting position must be `0`.
