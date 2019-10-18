# Concepts

This document highlights the different concepts used within Fossil. The goal is to give you an
overview of what they are and where are they used.

## Event

This is an event, as defined by the [CloudEvents spec](https://github.com/cloudevents/spec).

## Stream (or _aggregate_)

One stream is one instance of a specific stream pattern. 
For example: `visits/0d11536e-a33b-4ee9-b14f-29f6764d24cd`.

## Stream pattern

This is an abstraction allowing the event store to create the stream from an event.
For example: `visits/{visit_id}`

## Stream matcher

Used when listening for messages. 
For example: `visits/*`
