export class EngineAudio {
  constructor(){this.enabled=true;this.ctx=null;this.lastGear=0}
  async init(){
    if(!this.ctx){
      const ctx=this.ctx=new (window.AudioContext||window.webkitAudioContext)();
      this.master=ctx.createGain();this.master.gain.value=0;this.master.connect(ctx.destination);
      this.filter=ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=900;this.filter.Q.value=.5;this.filter.connect(this.master);
      this.oscillators=[1,2.01,3.98].map((mult,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=i===2?'triangle':'sawtooth';o.frequency.value=90*mult;g.gain.value=[.38,.15,.09][i];o.connect(g);g.connect(this.filter);o.start();return {o,mult}});
      const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;const noiseFilter=ctx.createBiquadFilter();noiseFilter.type='bandpass';noiseFilter.frequency.value=1400;
      this.wind=ctx.createGain();this.wind.gain.value=0;source.connect(noiseFilter);noiseFilter.connect(this.wind);this.wind.connect(this.master);source.start();
    }
    if(this.ctx.state==='suspended')await this.ctx.resume();
  }
  update(speed,throttle,gear,active){if(!this.ctx)return;const t=this.ctx.currentTime,rpm=(speed*3.6%43)/43;const frequency=85+rpm*110+Math.min(speed/100,1)*35;
    for(const {o,mult} of this.oscillators)o.frequency.setTargetAtTime(frequency*mult,t,.065);
    this.filter.frequency.setTargetAtTime(350+rpm*1300+throttle*350,t,.1);
    this.wind.gain.setTargetAtTime(speed/110*.19,t,.2);
    this.master.gain.setTargetAtTime(active&&this.enabled ? .09+throttle*.045 : 0,t,.12);
  }
  beep(frequency=600,duration=.1){if(!this.ctx||!this.enabled)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.frequency.value=frequency;g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+duration)}
}
