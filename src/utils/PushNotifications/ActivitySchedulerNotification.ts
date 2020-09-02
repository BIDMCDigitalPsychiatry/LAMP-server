const triweekly = [1, 3, 5]
const biweekly = [2, 4]
const daily = [0, 1, 2, 3, 4, 5, 6]

/*send notifications to each participant
 *
 */
export async function notify(subject: string, feed: any) {
  switch (feed.repeat_interval) {
    case "triweekly":
      break
    case "biweekly":
      break
    case "daily":
      break
    case "custom":
      break
    case "hourly":
      break
    case "every3h":
      break
    case "every6h":
      break
    case "every12h":
      break
    case "bimonthly":
      break
    case "none":
      break

    default:
      break
  }
  console.log("subject", subject)
  console.log("start_date", feed.start_date)
  console.log("time", feed.time)
  console.log("repeat_interval", feed.repeat_interval)
  //1.find device id from sensor_db
  //2.send push notification based on repeat interval

  //     switch (feed.repeat_interval) {
  //         case "triweekly":
  //             if() {

  //             }
  //             break
  //         case "biweekly":
  //             if() {

  //              }
  //             break

  // }
}

