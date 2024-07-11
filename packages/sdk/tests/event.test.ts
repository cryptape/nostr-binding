import { calcEventId } from '../src';

describe('Nostr Event', () => {
  test('Build EventId', () => {
    const expectEventId = '5b6ea23af84de6241bbb350e56a1efd003afa5bf224600f233cf013b9c821bb5';
    const event = {
      pubkey: '84dee6e676e5bb67b4ad4e042cf70cbd8681155db535942fcc6a0533858a7240',
      created_at: 1716936887,
      kind: 1,
      tags: [
        ['p', '84dee6e676e5bb67b4ad4e042cf70cbd8681155db535942fcc6a0533858a7240'],
        ['p', '6389be6491e7b693e9f368ece88fcd145f07c068d2c1bbae4247b9b5ef439d32'],
        ['e', 'ce2f7fcc291eda1586b8975328d928451de0178927ffe3b2f2eac292136a5a3e', 'wss://junxingwang.org', 'root'],
      ],
      content: 'The Industrial Revolution and its consequences have been a disaster for the human race. ',
    };
    const eventId = calcEventId(event);
    expect(eventId).toBe(expectEventId);
  });

  test('Build EventId Chinese', () => {
    const expectEventId = '08013c58d11f02a4c4e75cb7386ce0ad25c0ff18a7539de6ab666fa6aa7c300c';
    const event = {
      content:
        '这么问是因为我觉得整合nostr数据的LLM可以作为nostr的客户端，不用传统的社交媒体UI，使用Chat的UI。\n\n可以直接问：\n“简要报告今天关注的人发布了什么内容”\n“把今天最热门讨论内容摘要给我”\n“我想了解目前NIP XX讨论的最新进度”\n“用克林贡语发一篇帖子，同时通知X某某，内容是…”\n“发帖春节快乐，zap前十个祝福语回复各2100sats”\n\n也可以实现为其他平台比如Telegram的Bot，关联nsec后方便跨平台使用。\n\nnostr一直在讨论内容算法，LLM相比单薄的内容算法好太多了。 nostr:note14vremq6ugjt6p0rh0eh52ulykvphmugrc6zsvg57htsggjup4wqskzqv9g',
      created_at: 1717500090,
      kind: 1,
      pubkey: 'f0c864cf573de171053bef4df3b31c6593337a097fbbd9f20d78506e490c6b64',
      tags: [['p', 'f0c864cf573de171053bef4df3b31c6593337a097fbbd9f20d78506e490c6b64']],
      timestamp: 1717510610413,
    };
    const eventId = calcEventId(event);
    expect(eventId).toBe(expectEventId);
  });
});
