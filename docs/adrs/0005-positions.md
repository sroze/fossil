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
  the provided event(s). Expecting to write in an empty stream means the expected position is `0`.

- **Starting position.**
  TODO: document.

## Reflection

This is actually quite confusing to have an offset difference between "event position"
and "stream position". We can't have "stream position = -1" for empty streams just because we chose
`uint64` as the type for event positions. We can and probably should change this.

FIXME: enable `-1` (or similar value) when writing in the stream.
