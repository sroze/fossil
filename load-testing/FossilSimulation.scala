package fossil

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import scala.util.Properties
import java.util.UUID.randomUUID

class FossilSimulation extends Simulation {

  val httpProtocol = http.baseUrl(Config.FossilUrl)

  // Scenarios
  val collectScenario = scenario("Collect events")
    .pause(Config.ConcurrentCollectors)
    .exec(Collector.collectEvent)

  // Configuration
  private val rampUpTime: FiniteDuration = 30.seconds
  private val duration: FiniteDuration = 5.minutes

  setUp(
    // Ramp up all user for 10 seconds, import scala.concurrent.duration._ is needed
    collectScenario.inject(rampUsers(50000) during rampUpTime)
      .protocols(httpProtocol)
      // Throttling ensures required req/s will be accomplished. Scenario should run forever, numberOfRepetitions=-1
      // Note: holdFor() is mandatory otherwise RPS doesn't have any limit and increases until system crash
      .throttle(reachRps(100) in rampUpTime, holdFor(duration)),

    // Other things at the same time.
    // Ramp up all at once
    // Product.scnSearchAndOpen.inject(atOnceUsers(Constants.numberOfUsers))
  )
}
