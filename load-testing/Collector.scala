package fossil

import java.util.UUID.randomUUID
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.util.Properties

object Collector {
  private val streams = Array.fill(Config.NumberOfStreams){
    randomUUID().toString()
  }

  private val sentHeaders = Map("ce-type" -> "https://acme.com/PersonCreated", "ce-specversion" -> "0.3")

  val collectEvent = exec(
    http("Collect")
      .post("/collect")
      .header("ce-type", "https://acme.com/PersonCreated")
      .header("ce-id", _ => randomUUID().toString())
      .header("ce-source", "fossil-load-test")
      .header("fossil-stream", _ => streams(scala.util.Random.nextInt(Config.NumberOfStreams)))
      .headers(sentHeaders)
      .body(StringBody("""{ "key": "value" }"""))
      .check(status.is(200))
      .check(header("Fossil-Event-Number").saveAs("eventNumber"))
  )
}
