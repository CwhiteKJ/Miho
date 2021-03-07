const { find } = require("../utils/functions")
module.exports.run = async (_client, message, args, knex, embed) => {
  if (args.length < 3)
    return message.channel.send(
      `${message.member} \`${this.help.use}\`이 올바른 명령어에요!`
    )

  const res = find(args[1])
  if (!res || res.length === 0)
    return message.channel.send(
      `${message.member} \`${res}\`라는 종목을 찾을 수 없어요!`
    )
  else if (res.length > 1)
    return message.channel.send(
      `${message.member} \`${
        res.length
      }\`개의 종목이 검색됬어요. 좀 더 정확하게 입력해주세요! 검색 결과:\n${res
        .map((r) => r.name + "\n")
        .join(" ")}`
    )

  const user = (
    await knex("user").select("*").where({ id: message.author.id })
  )[0]
  const stock = (await knex("stocks").select("*").where({ name: res[0].id }))[0]
  var items = JSON.parse(user.items)

  var num = 0
  var dived = 0
  var total = 0

  if (["전부", "올인", "모두", "all"].includes(args[2])) {
    num = parseInt(Number(user.money) / Number(stock.now), 10)
    total = num * stock.now
    dived = Number(user.money) - total
  } else if (["반인", "반", "half"].includes(args[2])) {
    num = parseInt(Number(user.money) / 2 / Number(stock.now), 10)
    total = num * stock.now
    dived = Number(user.money) - total
  } else if (
    isNaN(Number(args[2])) ||
    !Number.isInteger(Number(args[2])) ||
    Number(args[2]) < 1
  ) {
    return message.channel.send(
      `${message.member} 올바르지 않은 값이에요! 올바른 정수를 입력해주세요!`
    )
  } else {
    num = Number(args[2])
    total = num * stock.now
    dived = Number(user.money) - total
  }
  if (dived < 0)
    return message.channel.send(
      `${message.member} 갯수만큼의 주식을 구매할 만큼의 금액을 소지하고 있지 않습니다!`
    )
  if (!items[res[0].id]) items[res[0].id] = num
  else items[res[0].id] += num
  embed.addField(
    `🧾 주문서`,
    `매수하려는 주식: \`${res[0].name}\`\n수량: \`${num}\`\n지불할 금액 \`${total}\`\n계속하실려면 💳 반응을 눌러주세요!`
  )

  if (total / 10000000000000000000 > Number(user.money))
    return message.channel.send(
      `${message.member} 돈도 많으신 양반이 너무 조금만 투자하는거 아니에요..?`
    )

  let msg = message.channel.send(`${message.member}`, { embed: embed })
  await knex("user").update({ action: 1 }).where({ id: message.author.id })
  const filter = (reaction, u) =>
    reaction.emoji.name === "💳" && u.id === message.author.id
  msg.then(async (m) => {
    m.react("💳")
    m.awaitReactions(filter, { max: 1, time: 10000, error: ["time"] }).then(
      async (collected) => {
        if (collected.size === 0) {
          await knex("user")
            .update({ action: 0 })
            .where({ id: message.author.id })
          return message.channel.send(`${message.member} 구매를 취소했어요!`)
        }
        await knex("user")
          .update({ money: dived, items: JSON.stringify(items) })
          .where({ id: message.author.id })
        embed = require("../utils/embed")(message)
        embed.addField(
          "✅ 결제가 완료되었습니다!",
          `주식: \`${res[0].name}\`\n수량 : \`${num}\`주\n지불한 금액 : \`${total}\`\n잔고 : \`${dived}\`원`
        )
        await knex("user")
          .update({ action: 0 })
          .where({ id: message.author.id })
        message.channel.send(`${message.member}`, { embed: embed })
      }
    )
  })
}

module.exports.help = {
  name: "매수",
  description: "주식을 구매합니다.",
  use: "미호야 매수 [주식이름] [모두/반/갯수]",
}
