// client/src/sfx.ts
type SFXName = 'turn' | 'raise';

class SFX {
  private audios: Partial<Record<SFXName, HTMLAudioElement>> = {};
  private unlocked = false;
  private mutes: Record<SFXName, boolean> = {
    turn:  localStorage.getItem('sfxMuted.turn')  === '1',
    raise: localStorage.getItem('sfxMuted.raise') === '1',
  };

  preload(map: Partial<Record<SFXName, string>>) {
    Object.entries(map).forEach(([name, url]) => {
      if (!url) return;
      const a = new Audio(url);
      a.preload = 'auto';
      a.volume = (name as SFXName) === 'turn' ? 0.6 : 0.9;
      this.audios[name as SFXName] = a;
    });
  }

  unlockOnce() {
    if (this.unlocked) return;
    this.unlocked = true;
    Object.values(this.audios).forEach(a => {
      try { a?.play().then(()=>a.pause()).catch(()=>{}); } catch {}
    });
  }

  play(name: SFXName) {
    if (this.mutes[name]) return;
    const a = this.audios[name];
    if (!a) return;
    try { a.currentTime = 0; a.play().catch(()=>{}); } catch {}
  }

  setMuted(name: SFXName, m: boolean) {
    this.mutes[name] = m;
    localStorage.setItem(`sfxMuted.${name}`, m ? '1' : '0');
  }

  isMuted(name: SFXName) {
    return !!this.mutes[name];
  }
}

export const sfx = new SFX();
