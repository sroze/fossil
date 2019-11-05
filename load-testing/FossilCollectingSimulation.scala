package fossil

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import scala.util.Properties
import java.util.UUID.randomUUID

class FossilCollectingSimulation extends Simulation {

  val httpProtocol = http.baseUrl(Config.FossilUrl)

  // Configuration
  private val duration: FiniteDuration = 60.minutes

  setUp(
    Collector.collectMultipleEventsScenario.inject(rampUsers(Config.NumberOfStreams) during duration)
      .protocols(httpProtocol)
      .throttle(
        reachRps(100) in (5 minutes),
        holdFor(15 minute),
        reachRps(150) in (5 minutes),
        holdFor(15 minutes),
        reachRps(200) in (5 minutes),
        holdFor(15 minutes)
      ),
  )
}
