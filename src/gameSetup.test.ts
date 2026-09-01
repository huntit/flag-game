import { describe, it, expect } from 'vitest';
import {
  pickHumanSeat,
  soloFirstPlayerBanner,
  hotseatFirstPlayerBanner,
  remoteFirstPlayerBanner,
  gameHasStarted,
} from './gameSetup';
import { mulberry32 } from './engine/game';

describe('first-player assignment (no menu)', () => {
  it('randomises solo human seat 50/50 over many seeds', () => {
    let humanP1 = 0;
    for (let seed = 0; seed < 200; seed++) {
      const rand = mulberry32(seed);
      if (pickHumanSeat(rand) === 0) humanP1++;
    }
    expect(humanP1).toBeGreaterThan(60);
    expect(humanP1).toBeLessThan(140);
  });

  it('solo banner reads You play first when human is P1', () => {
    expect(soloFirstPlayerBanner(0, 'Hunter')).toBe('You play first');
  });

  it('solo banner reads AI name when human is P2', () => {
    expect(soloFirstPlayerBanner(1, 'Hunter')).toBe('Hunter plays first');
    expect(soloFirstPlayerBanner(1, 'Greedy')).toBe('Greedy plays first');
  });

  it('hotseat and remote banners use seat colour names', () => {
    expect(hotseatFirstPlayerBanner()).toBe('Teal plays first');
    expect(remoteFirstPlayerBanner()).toBe('Teal plays first');
  });

  it('gameHasStarted is false until the first action', () => {
    expect(gameHasStarted(0)).toBe(false);
    expect(gameHasStarted(1)).toBe(true);
  });
});

describe('remote setup defers until second seat', () => {
  it('does not initialize on first seat alone', async () => {
    const { shouldInitializeRemoteGame, markSeatConnected } = await import('./remoteSetup');
    let connected = { P1: false, P2: false };
    connected = markSeatConnected(connected, 'P1');
    expect(shouldInitializeRemoteGame(connected, false)).toBe(false);
  });

  it('initializes when both seats have connected', async () => {
    const { shouldInitializeRemoteGame, markSeatConnected } = await import('./remoteSetup');
    let connected = { P1: false, P2: false };
    connected = markSeatConnected(connected, 'P1');
    connected = markSeatConnected(connected, 'P2');
    expect(shouldInitializeRemoteGame(connected, false)).toBe(true);
    expect(shouldInitializeRemoteGame(connected, true)).toBe(false);
  });
});
