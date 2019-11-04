package fossil

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.util.Properties
import java.net.URLEncoder

object Consumer {
  val listenEventsFor2Minutes = scenario("Listen for 2 minutes")
    .exec(
      sse("StreamEvents").connect("/sse?stream=" + URLEncoder.encode(Config.StreamPrefix + "/{id}"))
    )
    .pause(120)
    .exec(sse("Close").close())
}
