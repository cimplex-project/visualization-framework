// EXAMPLE: SIR-R04
nds_isi_Connector.settings.templates.push({
  name: "H1N1 Stuttgart SR",
  simulation: `
<simulation xmlns="http://www.gleamviz.org/xmlns/gleamviz_v4_0">
  <definition id="1488552513301.B91" name="H1N1 Stuttgart SR" sim_type="GLEAM" type="single-run">
    <compartmentalModel>
      <compartments>
        <compartment id="Susceptible" color="#51b2b7" isSecondary="false" x="236" isCommuter="true" isCarrier="false" y="5" isTraveller="true"/>
        <compartment id="Latent" color="#00c18d" isSecondary="false" x="236" isCommuter="true" isCarrier="true" y="212" isTraveller="true"/>
        <compartment id="Infectious_SympT" color="#ff5127" isSecondary="true" x="236" isCommuter="true" isCarrier="true" y="381" isTraveller="true"/>
        <compartment id="Recovered" color="#89c443" isSecondary="false" x="236" isCommuter="true" isCarrier="false" y="532" isTraveller="true"/>
        <compartment id="Infectious_Asymp" color="#f4ce17" isSecondary="false" x="5" isCommuter="true" isCarrier="true" y="355" isTraveller="true"/>
        <compartment id="Infectious_SympNT" color="#f59123" isSecondary="true" x="497" isCommuter="false" isCarrier="true" y="351" isTraveller="false"/>
      </compartments>
      <ratioTransitions>
        <ratioTransition source="Latent" ratio="epsilon*pt*upa" labelPosition="0.3" target="Infectious_SympT"/>
        <ratioTransition source="Infectious_SympT" ratio="mu" labelPosition="0.5" target="Recovered"/>
        <ratioTransition source="Latent" ratio="epsilon*pa" labelPosition="0.5" target="Infectious_Asymp"/>
        <ratioTransition source="Latent" ratio="epsilon*upt*upa" labelPosition="0.6" target="Infectious_SympNT"/>
        <ratioTransition source="Infectious_Asymp" ratio="mu" labelPosition="0.5" target="Recovered"/>
        <ratioTransition source="Infectious_SympNT" ratio="mu" labelPosition="0.5" target="Recovered"/>
      </ratioTransitions>
      <infections>
        <infection source="Susceptible" target="Latent">
          <infector source="Infectious_SympT" ratio="beta" x="147" y="-27"/>
          <infector source="Infectious_Asymp" ratio="rbeta*beta" x="-272" y="-27"/>
          <infector source="Infectious_SympNT" ratio="beta" x="146" y="-29"/>
        </infection>
      </infections>
      <variables>
        <variable name="beta" value="0.76"/>
        <variable name="epsilon" value="1/1.1"/>
        <variable name="mu" value="1/2.9"/>
        <variable name="pa" value="0.23"/>
        <variable name="pt" value="0.5"/>
        <variable name="rbeta" value="0.5"/>
        <variable name="upa" value="1-pa"/>
        <variable name="upt" value="1-pt"/>
      </variables>
    </compartmentalModel>
    <parameters startDate="2017-02-10" runCount="10" commutingModel="gravity" outbreakSize="2" occupancyRate="100" duration="365" commutingRate="8" secondaryEvents="1" seasonalityEnabled="true" flightsTimeAggregation="month" seasonalityAlphaMin="0.50"/>
    <notes/>
    <initialCompartments>
      <initialCompartment fraction="100" compartment="Susceptible"/>
    </initialCompartments>
    <seeds>
      <seed compartment="Infectious_SympT" city="732" number="5"/>
      <seed compartment="Infectious_SympNT" city="732" number="5"/>
    </seeds>
    <resultCompartments>
      <id>Infectious_SympT</id>
      <id>Infectious_Asymp</id>
      <id>Infectious_SympNT</id>
    </resultCompartments>
    <exceptions/>
  </definition>
  <metadata>
    <creationDate>2017-03-03T15:39:08</creationDate>
    <clientVersion>6.7</clientVersion>
  </metadata>
  <extradata>
    <userVariableOrder></userVariableOrder>
  </extradata>
</simulation>
`
});

nds_isi_Connector.settings.templates.push({
  name: "H1N1 Mexico SR",
  simulation: `
<simulation xmlns="http://www.gleamviz.org/xmlns/gleamviz_v4_0">
  <definition id="1488552984881.B91" name="H1N1 Mexico SR" sim_type="GLEAM" type="single-run">
    <compartmentalModel>
      <compartments>
        <compartment id="Susceptible" color="#51b2b7" isSecondary="false" x="236" isCommuter="true" isCarrier="false" y="5" isTraveller="true"/>
        <compartment id="Latent" color="#00c18d" isSecondary="false" x="236" isCommuter="true" isCarrier="true" y="212" isTraveller="true"/>
        <compartment id="Infectious_SympT" color="#ff5127" isSecondary="true" x="236" isCommuter="true" isCarrier="true" y="381" isTraveller="true"/>
        <compartment id="Recovered" color="#89c443" isSecondary="false" x="236" isCommuter="true" isCarrier="false" y="532" isTraveller="true"/>
        <compartment id="Infectious_Asymp" color="#f4ce17" isSecondary="false" x="5" isCommuter="true" isCarrier="true" y="355" isTraveller="true"/>
        <compartment id="Infectious_SympNT" color="#f59123" isSecondary="true" x="497" isCommuter="false" isCarrier="true" y="351" isTraveller="false"/>
      </compartments>
      <ratioTransitions>
        <ratioTransition source="Latent" ratio="epsilon*pt*upa" labelPosition="0.3" target="Infectious_SympT"/>
        <ratioTransition source="Infectious_SympT" ratio="mu" labelPosition="0.5" target="Recovered"/>
        <ratioTransition source="Latent" ratio="epsilon*pa" labelPosition="0.5" target="Infectious_Asymp"/>
        <ratioTransition source="Latent" ratio="epsilon*upt*upa" labelPosition="0.6" target="Infectious_SympNT"/>
        <ratioTransition source="Infectious_Asymp" ratio="mu" labelPosition="0.5" target="Recovered"/>
        <ratioTransition source="Infectious_SympNT" ratio="mu" labelPosition="0.5" target="Recovered"/>
      </ratioTransitions>
      <infections>
        <infection source="Susceptible" target="Latent">
          <infector source="Infectious_SympT" ratio="beta" x="147" y="-27"/>
          <infector source="Infectious_Asymp" ratio="rbeta*beta" x="-272" y="-27"/>
          <infector source="Infectious_SympNT" ratio="beta" x="146" y="-29"/>
        </infection>
      </infections>
      <variables>
        <variable name="beta" value="0.76"/>
        <variable name="epsilon" value="1/1.1"/>
        <variable name="mu" value="1/2.9"/>
        <variable name="pa" value="0.23"/>
        <variable name="pt" value="0.5"/>
        <variable name="rbeta" value="0.5"/>
        <variable name="upa" value="1-pa"/>
        <variable name="upt" value="1-pt"/>
      </variables>
    </compartmentalModel>
    <parameters startDate="2017-02-10" runCount="10" commutingModel="gravity" outbreakSize="2" occupancyRate="100" duration="365" commutingRate="8" secondaryEvents="1" seasonalityEnabled="true" flightsTimeAggregation="month" seasonalityAlphaMin="0.50"/>
    <notes/>
    <initialCompartments>
      <initialCompartment fraction="100" compartment="Susceptible"/>
    </initialCompartments>
    <seeds>
      <seed compartment="Infectious_SympT" city="995" number="5"/>
      <seed compartment="Infectious_SympNT" city="995" number="5"/>
    </seeds>
    <resultCompartments>
      <id>Infectious_SympT</id>
      <id>Infectious_Asymp</id>
      <id>Infectious_SympNT</id>
    </resultCompartments>
    <exceptions>
      <exception continents="" till="2018-02-10" countries="133" basins="" hemispheres="" from="2017-05-10" regions="">
        <variable name="pt" value="0.05"/>
      </exception>
    </exceptions>
  </definition>
  <metadata>
    <creationDate>2017-03-03T15:39:08</creationDate>
    <clientVersion>6.7</clientVersion>
  </metadata>
  <extradata>
    <userVariableOrder></userVariableOrder>
  </extradata>
</simulation>

`
});

nds_isi_Connector.settings.templates.push({
  name: "SIR R0=4",
  simulation: `
<simulation xmlns="http://www.gleamviz.org/xmlns/gleamviz_v4_0">
  <definition sim_type="GLEAM" type="single-run" id="1484660672292.B91" name="SIR R0=4">
    <compartmentalModel>
      <compartments>
        <compartment isSecondary="false" color="#51b2b7" isTraveller="true" isCarrier="false" id="S" isCommuter="true" x="265" y="97"/>
        <compartment isSecondary="true" color="#ff5127" isTraveller="true" isCarrier="true" id="I" isCommuter="true" x="265" y="297"/>
        <compartment isSecondary="false" color="#89c443" isTraveller="true" isCarrier="false" id="R" isCommuter="true" x="265" y="497"/>
      </compartments>
      <ratioTransitions>
        <ratioTransition source="I" ratio="0.2" target="R" labelPosition="0.5"/>
      </ratioTransitions>
      <infections>
        <infection source="S" target="I">
          <infector source="I" ratio="0.8" x="100" y="0"/>
        </infection>
      </infections>
      <variables/>
    </compartmentalModel>
    <parameters runCount="10" startDate="2017-01-17" seasonalityEnabled="true" duration="100" outbreakSize="2" flightsTimeAggregation="month" secondaryEvents="1" occupancyRate="100" commutingModel="gravity" seasonalityAlphaMin="0.50" commutingRate="8"/>
    <notes/>
    <initialCompartments>
      <initialCompartment compartment="S" fraction="100"/>
    </initialCompartments>
    <seeds>
      <seed compartment="I" city="1216" number="25"/>
    </seeds>
    <resultCompartments>
      <id>I</id>
    </resultCompartments>
    <exceptions/>
  </definition>
  <metadata>
    <creationDate>2017-01-17T14:41:04</creationDate>
    <clientVersion>6.7</clientVersion>
  </metadata>
  <extradata>
    <userVariableOrder></userVariableOrder>
  </extradata>
</simulation>
`
});

nds_isi_Connector.settings.templates.push({
  name: "Flu sim test #5",
  simulation: `<simulation xmlns="http://www.gleamviz.org/xmlns/gleamviz_v4_0">
      <definition type="single-run" name="Flu sim test #5" sim_type="GLEAM" id="1479307754388.B91">
        <compartmentalModel>
          <compartments>
            <compartment color="#00c18d" isCommuter="true" x="323" isSecondary="false" y="52" isCarrier="false" isTraveller="true" id="Susceptible"/>
            <compartment color="#f4ce17" isCommuter="true" x="323" isSecondary="false" y="234" isCarrier="true" isTraveller="true" id="Exposed"/>
            <compartment color="#ff5127" isCommuter="true" x="391" isSecondary="true" y="433" isCarrier="true" isTraveller="false" id="Infectious"/>
            <compartment color="#f59123" isCommuter="true" x="716" isSecondary="false" y="382" isCarrier="true" isTraveller="true" id="Asymptomatic"/>
            <compartment color="#ff5127" isCommuter="false" x="17" isSecondary="true" y="425" isCarrier="true" isTraveller="false" id="Infectious_sympt_AV"/>
            <compartment color="#89c443" isCommuter="true" x="335" isSecondary="false" y="616" isCarrier="false" isTraveller="true" id="Recovered"/>
            <compartment color="#51b2b7" isCommuter="true" x="49" isSecondary="false" y="180" isCarrier="false" isTraveller="true" id="Vaccinated"/>
          </compartments>
          <ratioTransitions>
            <ratioTransition source="Susceptible" labelPosition="0.5" target="Vaccinated" ratio="gamma"/>
            <ratioTransition source="Exposed" labelPosition="0.5" target="Infectious" ratio="epsilon*sympt_prob*upa"/>
            <ratioTransition source="Exposed" labelPosition="0.5" target="Asymptomatic" ratio="epsilon*ups"/>
            <ratioTransition source="Infectious" labelPosition="0.5" target="Recovered" ratio="mu"/>
            <ratioTransition source="Asymptomatic" labelPosition="0.5" target="Recovered" ratio="mu"/>
            <ratioTransition source="Exposed" labelPosition="0.5" target="Infectious_sympt_AV" ratio="epsilon*sympt_prob*pavt"/>
            <ratioTransition source="Infectious_sympt_AV" labelPosition="0.5" target="Recovered" ratio="mu_av"/>
          </ratioTransitions>
          <infections>
            <infection source="Susceptible" target="Exposed">
              <infector source="Infectious" x="179" y="-27" ratio="beta"/>
              <infector source="Asymptomatic" x="179" y="12" ratio="beta"/>
            </infection>
          </infections>
          <variables>
            <variable name="vacc_rate" value="0.01"/>
            <variable name="vacc_lat_imm" value="7"/>
            <variable name="vacc_efficacy" value="0.75"/>
            <variable name="gamma" value="(vacc_rate/vacc_lat_imm)*vacc_efficacy"/>
            <variable name="R0" value="1.7"/>
            <variable name="epsilon" value="0.7"/>
            <variable name="mu" value="0.6"/>
            <variable name="beta" value="R0*mu"/>
            <variable name="sympt_prob" value="0.8"/>
            <variable name="av_eff" value="0.7"/>
            <variable name="av_prob" value="0.1"/>
            <variable name="pavt" value="av_eff*av_prob"/>
            <variable name="mu_av" value="1"/>
            <variable name="ups" value="1-sympt_prob"/>
            <variable name="upa" value="1-pavt"/>
          </variables>
        </compartmentalModel>
        <parameters seasonalityEnabled="true" occupancyRate="100" runCount="10" outbreakSize="2" duration="365" commutingRate="8" flightsTimeAggregation="month" commutingModel="gravity" startDate="2016-11-16" secondaryEvents="1" seasonalityAlphaMin="0.50"/>
        <notes/>
        <initialCompartments>
          <initialCompartment compartment="Susceptible" fraction="100"/>
        </initialCompartments>
        <seeds>
          <seed compartment="Infectious" city="3227" number="5"/>
        </seeds>
        <resultCompartments>
          <id>Infectious_sympt_AV</id>
          <id>Asymptomatic</id>
          <id>Infectious</id>
          <id>Vaccinated</id>
        </resultCompartments>
        <exceptions>
          <exception countries="" hemispheres="0" from="2016-11-16" continents="" basins="" regions="" till="2017-11-16">
            <variable name="vacc_rate" value="0.0"/>
          </exception>
          <exception countries="" hemispheres="" from="2017-01-13" continents="" basins="3069" regions="" till="2017-11-16">
            <variable name="mu" value=".5"/>
          </exception>
        </exceptions>
      </definition>
      <metadata>
        <creationDate>2016-11-16T15:49:14</creationDate>
        <clientVersion>6.7</clientVersion>
      </metadata>
      <extradata>
        <userVariableOrder></userVariableOrder>
      </extradata>
    </simulation>
`
});
