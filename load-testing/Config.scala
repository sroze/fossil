package fossil

import scala.util.Properties

object Config {
  val FossilUrl = Properties.envOrElse("FOSSIL_URL", "http://localhost:8080")
  val TotalNumberOfEvents = Properties.envOrElse("TOTAL_NUMBER_OF_EVENTS", "5000000").toInt
  val NumberOfEventsPerStream = Properties.envOrElse("NUMBER_OF_EVENTS_PER_STREAM", "100" ).toInt
  var NumberOfStreams = TotalNumberOfEvents / NumberOfEventsPerStream
}
