package fossil

import scala.util.Properties

object Config {
  val FossilUrl = Properties.envOrElse("FOSSIL_URL", "http://localhost:8080")
  val TotalNumberOfEvents = Properties.envOrElse("TOTAL_NUMBER_OF_EVENTS", "100000").toInt
  val NumberOfEventsPerString = Properties.envOrElse("NUMBER_OF_EVENTS_PER_STREAM", "1000" ).toInt
  var ConcurrentCollectors = Properties.envOrElse("CONCURRENT_COLLECTIONS", "10").toInt
  var NumberOfStreams = TotalNumberOfEvents / NumberOfEventsPerString
}
