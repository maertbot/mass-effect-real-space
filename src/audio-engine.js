function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createImpulseResponse(context, seconds = 2.6, decay = 2.1) {
  const sampleRate = context.sampleRate;
  const length = sampleRate * seconds;
  const impulse = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel += 1) {
    const channelData = impulse.getChannelData(channel);

    for (let index = 0; index < length; index += 1) {
      const attenuation = (1 - index / length) ** decay;
      channelData[index] = (Math.random() * 2 - 1) * attenuation * 0.18;
    }
  }

  return impulse;
}

export class AudioEngine {
  constructor() {
    this.context = null;
    this.started = false;
    this.masterGain = null;
    this.droneGain = null;
    this.hoverGain = null;
    this.hoverColorGain = null;
    this.droneFilter = null;
    this.hoverOscA = null;
    this.hoverOscB = null;
    this.status = 'standby';
  }

  async start() {
    if (this.started) {
      if (this.context?.state === 'suspended') {
        await this.context.resume();
      }

      return true;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      this.status = 'unsupported';
      return false;
    }

    this.context = new AudioContextClass();
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    const masterGain = this.context.createGain();
    masterGain.gain.value = 0.18;
    masterGain.connect(this.context.destination);
    this.masterGain = masterGain;

    const convolver = this.context.createConvolver();
    convolver.buffer = createImpulseResponse(this.context);

    const reverbMix = this.context.createGain();
    reverbMix.gain.value = 0.14;
    convolver.connect(reverbMix);
    reverbMix.connect(masterGain);

    const droneBus = this.context.createGain();
    droneBus.gain.value = 0.12;
    droneBus.connect(masterGain);
    droneBus.connect(convolver);

    const droneFilter = this.context.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 160;
    droneFilter.Q.value = 0.3;
    droneFilter.connect(droneBus);
    this.droneFilter = droneFilter;

    const droneOscA = this.context.createOscillator();
    droneOscA.type = 'sawtooth';
    droneOscA.frequency.value = 58;
    droneOscA.connect(droneFilter);

    const droneOscB = this.context.createOscillator();
    droneOscB.type = 'triangle';
    droneOscB.frequency.value = 61;
    droneOscB.connect(droneFilter);

    const droneLfo = this.context.createOscillator();
    droneLfo.frequency.value = 0.05;
    const droneLfoGain = this.context.createGain();
    droneLfoGain.gain.value = 45;
    droneLfo.connect(droneLfoGain);
    droneLfoGain.connect(droneFilter.frequency);

    droneOscA.start();
    droneOscB.start();
    droneLfo.start();

    const hoverBus = this.context.createGain();
    hoverBus.gain.value = 0.06;
    hoverBus.connect(masterGain);
    hoverBus.connect(convolver);

    const hoverFilter = this.context.createBiquadFilter();
    hoverFilter.type = 'bandpass';
    hoverFilter.frequency.value = 300;
    hoverFilter.Q.value = 0.6;
    hoverFilter.connect(hoverBus);

    const hoverGain = this.context.createGain();
    hoverGain.gain.value = 0.00001;
    hoverGain.connect(hoverFilter);
    this.hoverGain = hoverGain;

    const hoverColorGain = this.context.createGain();
    hoverColorGain.gain.value = 0.00001;
    hoverColorGain.connect(hoverFilter);
    this.hoverColorGain = hoverColorGain;

    const hoverOscA = this.context.createOscillator();
    hoverOscA.type = 'sine';
    hoverOscA.frequency.value = 240;
    hoverOscA.connect(hoverGain);

    const hoverOscB = this.context.createOscillator();
    hoverOscB.type = 'triangle';
    hoverOscB.frequency.value = 360;
    hoverOscB.connect(hoverColorGain);

    hoverOscA.start();
    hoverOscB.start();

    this.hoverOscA = hoverOscA;
    this.hoverOscB = hoverOscB;
    this.droneGain = droneBus;
    this.started = true;
    this.status = 'online';
    return true;
  }

  setHoverSystem(system) {
    if (!this.started || !this.context) {
      return;
    }

    const now = this.context.currentTime;
    const teff = Number.isFinite(system?.teff) ? system.teff : 5200;
    const normalizedTemp = clamp((teff - 2600) / (12000 - 2600), 0, 1);
    const baseFrequency = 210 + normalizedTemp * 360;
    const accentFrequency = system?.typeFlags?.habZone ? baseFrequency * 1.25 : baseFrequency * 1.45;
    const hoverGain = system?.typeFlags?.habZone ? 0.018 : 0.012;

    this.hoverOscA.frequency.cancelScheduledValues(now);
    this.hoverOscA.frequency.linearRampToValueAtTime(baseFrequency, now + 0.08);
    this.hoverOscB.frequency.cancelScheduledValues(now);
    this.hoverOscB.frequency.linearRampToValueAtTime(accentFrequency, now + 0.12);

    this.hoverGain.gain.cancelScheduledValues(now);
    this.hoverGain.gain.setTargetAtTime(hoverGain, now, 0.05);

    this.hoverColorGain.gain.cancelScheduledValues(now);
    this.hoverColorGain.gain.setTargetAtTime(system?.typeFlags?.habZone ? 0.01 : 0.006, now, 0.08);
  }

  clearHover() {
    if (!this.started || !this.context) {
      return;
    }

    const now = this.context.currentTime;
    this.hoverGain.gain.cancelScheduledValues(now);
    this.hoverGain.gain.setTargetAtTime(0.00001, now, 0.08);
    this.hoverColorGain.gain.cancelScheduledValues(now);
    this.hoverColorGain.gain.setTargetAtTime(0.00001, now, 0.12);
  }
}
