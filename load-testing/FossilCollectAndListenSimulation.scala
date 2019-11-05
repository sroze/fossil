package fossil

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import scala.util.Properties
import java.util.UUID.randomUUID

class FossilCollectAndListenSimulation extends Simulation {

  val httpProtocol = http.baseUrl(Config.FossilUrl)

  // Configuration
  private val duration: FiniteDuration = 30.minutes

  setUp(
    Collector.collectMultipleEventsScenario.inject(rampUsers(Config.NumberOfStreams) during duration)
      .protocols(httpProtocol)
      .throttle(
        reachRps(100) in (1 minute),
        holdFor(FiniteDuration),
      ),
    Consumer.listenEventsFor2Minutes.inject(
      rampUsers(50) during duration
    )
      .protocols(httpProtocol)
  )
}
