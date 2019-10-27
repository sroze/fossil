package fossil

import java.util.UUID.randomUUID
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.util.Properties
import java.text.SimpleDateFormat
import java.util.Date

object Collector {
  private val sentHeaders = Map("ce-type" -> "https://acme.com/PersonCreated", "ce-specversion" -> "0.3")

  private val collectEvent = exec(
    http("Collect")
      .post("/collect")
      .header("ce-type", "https://acme.com/PersonCreated")
      .header("ce-id", _ => randomUUID().toString())
      .header("ce-time", _ => (new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX").format(new Date())))
      .header("ce-source", "fossil-load-test")
      .header("fossil-stream", _ => Config.Streams(scala.util.Random.nextInt(Config.NumberOfStreams)))
      .headers(sentHeaders)
      .body(StringBody("""{ "key": "value" }"""))
      .check(status.is(200))
      .check(header("Fossil-Event-Number").saveAs("eventNumber"))
  )

  // Scenarios
  val collectMultipleEventsScenario = scenario("Collect multiple events on a stream")
    .repeat(Config.NumberOfEventsPerStream) {
        Collector.collectEvent
    }
}
