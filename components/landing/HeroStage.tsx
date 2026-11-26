import { BotHero } from "./BotHero";

/**
 * Holds the hero sequence.
 *
 * The bloom behind it is a separate layer rather than a shadow on the bot,
 * so the glow stays put on the floor while the assistant travels across it
 * — a light source that followed the bot around would give the depth away
 * immediately.
 */
export function HeroStage() {
  return (
    <div className="landing-stage">
      <div className="landing-stage-bloom" aria-hidden />
      <BotHero />
    </div>
  );
}
