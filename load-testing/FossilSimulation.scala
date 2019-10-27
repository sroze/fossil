package fossil

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import scala.util.Properties
import java.util.UUID.randomUUID

class FossilSimulation extends Simulation {

  val httpProtocol = http.baseUrl(Config.FossilUrl)

  // Configuration
  // private val rampUpTime: FiniteDuration = 30.seconds
  private val duration: FiniteDuration = 30.minutes

  setUp(
    Collector.collectMultipleEventsScenario.inject(rampUsers(Config.NumberOfStreams) during duration)
      .protocols(httpProtocol)
      .throttle(
        reachRps(50) in (30 seconds),
        holdFor(1 minute),
        reachRps(100) in (5 minutes),
        holdFor(10 minutes),
        reachRps(200) in (5 minutes),
        holdFor(10 minutes)
      ),
    Consumer.listenEventsFor2Minutes.inject(
      rampUsers(50) during duration
    )
      .protocols(httpProtocol)
  )
}
