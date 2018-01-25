// EXAMPLE: slovenia_FLU_18 & EXP
abm_isifbk_Connector.templatesFBK.push({
	name: "FLU ABM with interventions; Slovenia",
	simulation: `
		<simulation xmlns="http://www.gleamviz.org/xmlns/gleamviz_v4_0">
		  <definition name="FLU ABM with interventions; Slovenia" sim_type="ABM" abm_id="FBK-SI" id="1479222222224.XYZ" type="multi-run">
		    <compartmentalModel>
		      <compartments>
		        <compartment id="Susceptible" color="#00c18d" x="323" y="52" isSecondary="false" isCommuter="true" isCarrier="false" isTraveller="true"/>
		        <compartment id="Exposed" color="#f4ce17" x="323" y="234" isSecondary="false" isCommuter="true" isCarrier="true" isTraveller="true"/>
		        <compartment id="Infectious" color="#ff5127" x="391" y="433" isSecondary="true" isCommuter="true" isCarrier="true" isTraveller="false"/>
		        <compartment id="Asymptomatic" color="#f59123" x="716" y="382" isSecondary="false" isCommuter="true" isCarrier="true" isTraveller="true"/>
		        <compartment id="Infectious_sympt_AV" color="#ff5127" x="17" y="425" isSecondary="true" isCommuter="false" isCarrier="true" isTraveller="false"/>
		        <compartment id="Recovered" color="#89c443" x="335" y="616" isSecondary="false" isCommuter="true" isCarrier="false" isTraveller="true"/>
		        <compartment id="Vaccinated" color="#51b2b7" x="49" y="180" isSecondary="false" isCommuter="true" isCarrier="false" isTraveller="true"/>
		      </compartments>
		      <ratioTransitions>
		        <ratioTransition source="Susceptible" ratio="gamma" labelPosition="0.5" target="Vaccinated"/>
		        <ratioTransition source="Exposed" ratio="epsilon*sympt_prob*upa" labelPosition="0.5" target="Infectious"/>
		        <ratioTransition source="Exposed" ratio="epsilon*ups" labelPosition="0.5" target="Asymptomatic"/>
		        <ratioTransition source="Infectious" ratio="mu" labelPosition="0.5" target="Recovered"/>
		        <ratioTransition source="Asymptomatic" ratio="mu" labelPosition="0.5" target="Recovered"/>
		        <ratioTransition source="Exposed" ratio="epsilon*sympt_prob*pavt" labelPosition="0.5" target="Infectious_sympt_AV"/>
		        <ratioTransition source="Infectious_sympt_AV" ratio="mu_av" labelPosition="0.5" target="Recovered"/>
		      </ratioTransitions>
		      <infections>
		        <infection source="Susceptible" target="Exposed">
		          <infector source="Infectious" ratio="beta" x="179" y="-27"/>
		          <infector source="Asymptomatic" ratio="beta" x="179" y="12"/>
		        </infection>
		      </infections>
		      <variables>
		        <variable editable="true" name="vacc_rate" value="0.01" minval="0" maxval="1"/>
		        <variable editable="true" name="vacc_lat_imm" value="7" minval="1"/>
		        <variable editable="true" name="vacc_efficacy" value="0.75" minval="0" maxval="1"/>
		        <variable editable="false" name="gamma" value="(vacc_rate/vacc_lat_imm)*vacc_efficacy"/>
		        <variable editable="true" name="R0" value="1.4" minval="1.3" maxval="2.1"/>
		        <variable editable="true" name="epsilon" value="1/1.5" minval="0.5" maxval="2.5"/>
		        <variable editable="true" name="mu" value="1/2.0" minval="0.5" maxval="2.5"/>
		        <variable editable="false" name="beta" value="R0*mu"/>
		        <variable editable="true" name="sympt_prob" value="0.3" minval="0" maxval="1"/>
		        <variable editable="true" name="av_eff" value="0.6" minval="0" maxval="1"/>
		        <variable editable="true" name="av_prob" value="0.05" minval="0" maxval="1"/>
		        <variable editable="false" name="pavt" value="av_eff*av_prob"/>
		        <variable editable="false" name="mu_av" value="1"/>
		        <variable editable="false" name="ups" value="1-sympt_prob"/>
		        <variable editable="false" name="upa" value="1-pavt"/>
		      </variables>
		    </compartmentalModel>
		    <parameters outbreakSize="2" secondaryEvents="1" commutingRate="8" seasonalityEnabled="false" runCount="5" seasonalityAlphaMin="0.60" duration="365" commutingModel="gravity" startDate="2017-01-10" occupancyRate="100" flightsTimeAggregation="month"/>
		    <notes/>
		    <initialCompartments>
		      <initialCompartment compartment="Susceptible" fraction="100"/>
		    </initialCompartments>
		    <seeds>
		      <seed compartment="Infectious" city="355" number="20"/>
		    </seeds>
		    <resultCompartments>
		      <id>Vaccinated</id>
		      <id>Infectious</id>
		      <id>Asymptomatic</id>
		      <id>Infectious_sympt_AV</id>
		    </resultCompartments>
		    <exceptions>
		      <exception hemispheres="" continents="" from="2017-01-10" till="2017-10-10" regions="" countries="" basins="">
		        <variable value="0.0" name="vacc_rate"/>
		      </exception>
		      <exception hemispheres="" continents="" from="2017-01-10" till="2017-06-10" regions="" countries="" basins="">
		        <variable value="0.0" name="av_prob"/>
		      </exception>
		      <exception hemispheres="" continents="" from="2017-10-10" till="2018-01-10" regions="" countries="" basins="">
		        <variable value="0.0" name="av_prob"/>
		      </exception>
		    </exceptions>
		    <abmParameters>
		      <variable description="School closure: starting day">
		        <integer name="school_closure_start" minval="0" maxval="365">264</integer>
		      </variable>
		      <variable description="School closure: end day">
		        <integer name="school_closure_end" minval="0" maxval="365">295</integer>
		      </variable>
		      <variable description="Antiviral treatment: start day">
		        <integer name="antiviral_start" minval="0" maxval="365">151</integer>
		      </variable>
		      <variable description="Antiviral treatment: end day">
		        <integer name="antiviral_end" minval="0" maxval="365">273</integer>
		      </variable>
		      <variable description="Maximum number of antiviral doses available">
		        <integer name="antiviral_max_doses" minval="0">5000000</integer>
		      </variable>
		      <variable description="Vaccination campaign: start day">
		        <integer name="vacc_start" minval="0" maxval="365">273</integer>
		      </variable>
		      <variable description="Vaccination campaign: end day">
		        <integer name="vacc_end" minval="0" maxval="365">365</integer>
		      </variable>
		      <variable description="Maximum number of vaccine doses available">
		        <integer name="vacc_max_doses" minval="0">2000000</integer>
		      </variable>
		    </abmParameters>
		    <abmOutputData>
		      <value key="not_at_school" name="Not at school" desc="Number of individuals per 1000 who stayed home from school" position="1"/>
		      <value key="antiviral_doses" name="Given antivirals" desc="Number of individuals per 1000 who were given antivirals" position="2"/>
		      <value key="vaccine_doses" name="Vaccinated" desc="Number of individuals per 1000 being vaccinated" position="3"/>
		    </abmOutputData>
		  </definition>
		  <metadata>
		    <creationDate>2017-01-10T12:37:05</creationDate>
		    <clientVersion>6.7</clientVersion>
		  </metadata>
		  <extradata>
		    <abmVariableOrder>school_closure_start school_closure_end antiviral_start antiviral_end antiviral_max_doses vacc_start vacc_end vacc_max_doses</abmVariableOrder>
		    <userVariableOrder>vacc_rate vacc_efficacy vacc_lat_imm gamma R0 epsilon mu mu_iso beta beta_iso sympt_prob ups iso_prob upi</userVariableOrder>
		  </extradata>
		</simulation>
`
});

abm_isifbk_Connector.templatesFBK.push({
	name: "FLU ABM with interventions; Italy",
	simulation: `
	    <simulation xmlns="http://www.gleamviz.org/xmlns/gleamviz_v4_0">
		  <definition name="FLU ABM with interventions; Italy" sim_type="ABM" abm_id="FBK-IT" id="1479222222224.XYZ" type="multi-run">
		    <compartmentalModel>
		      <compartments>
		        <compartment id="Susceptible" color="#00c18d" x="323" y="52" isSecondary="false" isCommuter="true" isCarrier="false" isTraveller="true"/>
		        <compartment id="Exposed" color="#f4ce17" x="323" y="234" isSecondary="false" isCommuter="true" isCarrier="true" isTraveller="true"/>
		        <compartment id="Infectious" color="#ff5127" x="391" y="433" isSecondary="true" isCommuter="true" isCarrier="true" isTraveller="false"/>
		        <compartment id="Asymptomatic" color="#f59123" x="716" y="382" isSecondary="false" isCommuter="true" isCarrier="true" isTraveller="true"/>
		        <compartment id="Infectious_sympt_AV" color="#ff5127" x="17" y="425" isSecondary="true" isCommuter="false" isCarrier="true" isTraveller="false"/>
		        <compartment id="Recovered" color="#89c443" x="335" y="616" isSecondary="false" isCommuter="true" isCarrier="false" isTraveller="true"/>
		        <compartment id="Vaccinated" color="#51b2b7" x="49" y="180" isSecondary="false" isCommuter="true" isCarrier="false" isTraveller="true"/>
		      </compartments>
		      <ratioTransitions>
		        <ratioTransition source="Susceptible" ratio="gamma" labelPosition="0.5" target="Vaccinated"/>
		        <ratioTransition source="Exposed" ratio="epsilon*sympt_prob*upa" labelPosition="0.5" target="Infectious"/>
		        <ratioTransition source="Exposed" ratio="epsilon*ups" labelPosition="0.5" target="Asymptomatic"/>
		        <ratioTransition source="Infectious" ratio="mu" labelPosition="0.5" target="Recovered"/>
		        <ratioTransition source="Asymptomatic" ratio="mu" labelPosition="0.5" target="Recovered"/>
		        <ratioTransition source="Exposed" ratio="epsilon*sympt_prob*pavt" labelPosition="0.5" target="Infectious_sympt_AV"/>
		        <ratioTransition source="Infectious_sympt_AV" ratio="mu_av" labelPosition="0.5" target="Recovered"/>
		      </ratioTransitions>
		      <infections>
		        <infection source="Susceptible" target="Exposed">
		          <infector source="Infectious" ratio="beta" x="179" y="-27"/>
		          <infector source="Asymptomatic" ratio="beta" x="179" y="12"/>
		        </infection>
		      </infections>
		      <variables>
		        <variable editable="true" name="vacc_rate" value="0.01" minval="0" maxval="1"/>
		        <variable editable="true" name="vacc_lat_imm" value="7" minval="1"/>
		        <variable editable="true" name="vacc_efficacy" value="0.75" minval="0" maxval="1"/>
		        <variable editable="false" name="gamma" value="(vacc_rate/vacc_lat_imm)*vacc_efficacy"/>
		        <variable editable="true" name="R0" value="1.4" minval="1.3" maxval="2.1"/>
		        <variable editable="true" name="epsilon" value="1/1.5" minval="0.5" maxval="2.5"/>
		        <variable editable="true" name="mu" value="1/2.0" minval="0.5" maxval="2.5"/>
		        <variable editable="false" name="beta" value="R0*mu"/>
		        <variable editable="true" name="sympt_prob" value="0.3" minval="0" maxval="1"/>
		        <variable editable="true" name="av_eff" value="0.6" minval="0" maxval="1"/>
		        <variable editable="true" name="av_prob" value="0.05" minval="0" maxval="1"/>
		        <variable editable="false" name="pavt" value="av_eff*av_prob"/>
		        <variable editable="false" name="mu_av" value="1"/>
		        <variable editable="false" name="ups" value="1-sympt_prob"/>
		        <variable editable="false" name="upa" value="1-pavt"/>
		      </variables>
		    </compartmentalModel>
		    <parameters outbreakSize="2" secondaryEvents="1" commutingRate="8" seasonalityEnabled="false" runCount="5" seasonalityAlphaMin="0.60" duration="365" commutingModel="gravity" startDate="2017-01-10" occupancyRate="100" flightsTimeAggregation="month"/>
		    <notes/>
		    <initialCompartments>
		      <initialCompartment compartment="Susceptible" fraction="100"/>
		    </initialCompartments>
		    <seeds>
		      <seed compartment="Infectious" city="355" number="20"/>
		    </seeds>
		    <resultCompartments>
		      <id>Vaccinated</id>
		      <id>Infectious</id>
		      <id>Asymptomatic</id>
		      <id>Infectious_sympt_AV</id>
		    </resultCompartments>
		    <exceptions>
		      <exception hemispheres="" continents="" from="2017-01-10" till="2017-10-10" regions="" countries="" basins="">
		        <variable value="0.0" name="vacc_rate"/>
		      </exception>
		      <exception hemispheres="" continents="" from="2017-01-10" till="2017-06-10" regions="" countries="" basins="">
		        <variable value="0.0" name="av_prob"/>
		      </exception>
		      <exception hemispheres="" continents="" from="2017-10-10" till="2018-01-10" regions="" countries="" basins="">
		        <variable value="0.0" name="av_prob"/>
		      </exception>
		    </exceptions>
		    <abmParameters>
		      <variable description="School closure: starting day">
		        <integer name="school_closure_start" minval="0" maxval="365">264</integer>
		      </variable>
		      <variable description="School closure: end day">
		        <integer name="school_closure_end" minval="0" maxval="365">295</integer>
		      </variable>
		      <variable description="Antiviral treatment: start day">
		        <integer name="antiviral_start" minval="0" maxval="365">151</integer>
		      </variable>
		      <variable description="Antiviral treatment: end day">
		        <integer name="antiviral_end" minval="0" maxval="365">273</integer>
		      </variable>
		      <variable description="Maximum number of antiviral doses available">
		        <integer name="antiviral_max_doses" minval="0">5000000</integer>
		      </variable>
		      <variable description="Vaccination campaign: start day">
		        <integer name="vacc_start" minval="0" maxval="365">273</integer>
		      </variable>
		      <variable description="Vaccination campaign: end day">
		        <integer name="vacc_end" minval="0" maxval="365">365</integer>
		      </variable>
		      <variable description="Maximum number of vaccine doses available">
		        <integer name="vacc_max_doses" minval="0">2000000</integer>
		      </variable>
		    </abmParameters>
		    <abmOutputData>
		      <value key="not_at_school" name="Not at school" desc="Number of individuals per 1000 who stayed home from school" position="1"/>
		      <value key="antiviral_doses" name="Given antivirals" desc="Number of individuals per 1000 who were given antivirals" position="2"/>
		      <value key="vaccine_doses" name="Vaccinated" desc="Number of individuals per 1000 being vaccinated" position="3"/>
		    </abmOutputData>
		  </definition>
		  <metadata>
		    <creationDate>2017-01-10T12:37:05</creationDate>
		    <clientVersion>6.7</clientVersion>
		  </metadata>
		  <extradata>
		    <abmVariableOrder>school_closure_start school_closure_end antiviral_start antiviral_end antiviral_max_doses vacc_start vacc_end vacc_max_doses</abmVariableOrder>
		    <userVariableOrder>vacc_rate vacc_efficacy vacc_lat_imm gamma R0 epsilon mu mu_iso beta beta_iso sympt_prob ups iso_prob upi</userVariableOrder>
		  </extradata>
		</simulation>
`
});

abm_isifbk_Connector.templatesFBK.push({
	name: "FLU ABM with interventions; Germany",
	simulation: `
	   <simulation xmlns="http://www.gleamviz.org/xmlns/gleamviz_v4_0">
    		<definition name="FLU ABM with interventions; Germany" sim_type="ABM" abm_id="FBK-DE" id="1479222222224.XYZ" type="multi-run">
		    <compartmentalModel>
		      <compartments>
		        <compartment id="Susceptible" color="#00c18d" x="323" y="52" isSecondary="false" isCommuter="true" isCarrier="false" isTraveller="true"/>
		        <compartment id="Exposed" color="#f4ce17" x="323" y="234" isSecondary="false" isCommuter="true" isCarrier="true" isTraveller="true"/>
		        <compartment id="Infectious" color="#ff5127" x="391" y="433" isSecondary="true" isCommuter="true" isCarrier="true" isTraveller="false"/>
		        <compartment id="Asymptomatic" color="#f59123" x="716" y="382" isSecondary="false" isCommuter="true" isCarrier="true" isTraveller="true"/>
		        <compartment id="Infectious_sympt_AV" color="#ff5127" x="17" y="425" isSecondary="true" isCommuter="false" isCarrier="true" isTraveller="false"/>
		        <compartment id="Recovered" color="#89c443" x="335" y="616" isSecondary="false" isCommuter="true" isCarrier="false" isTraveller="true"/>
		        <compartment id="Vaccinated" color="#51b2b7" x="49" y="180" isSecondary="false" isCommuter="true" isCarrier="false" isTraveller="true"/>
		      </compartments>
		      <ratioTransitions>
		        <ratioTransition source="Susceptible" ratio="gamma" labelPosition="0.5" target="Vaccinated"/>
		        <ratioTransition source="Exposed" ratio="epsilon*sympt_prob*upa" labelPosition="0.5" target="Infectious"/>
		        <ratioTransition source="Exposed" ratio="epsilon*ups" labelPosition="0.5" target="Asymptomatic"/>
		        <ratioTransition source="Infectious" ratio="mu" labelPosition="0.5" target="Recovered"/>
		        <ratioTransition source="Asymptomatic" ratio="mu" labelPosition="0.5" target="Recovered"/>
		        <ratioTransition source="Exposed" ratio="epsilon*sympt_prob*pavt" labelPosition="0.5" target="Infectious_sympt_AV"/>
		        <ratioTransition source="Infectious_sympt_AV" ratio="mu_av" labelPosition="0.5" target="Recovered"/>
		      </ratioTransitions>
		      <infections>
		        <infection source="Susceptible" target="Exposed">
		          <infector source="Infectious" ratio="beta" x="179" y="-27"/>
		          <infector source="Asymptomatic" ratio="beta" x="179" y="12"/>
		        </infection>
		      </infections>
		      <variables>
		        <variable editable="true" name="vacc_rate" value="0.01" minval="0" maxval="1"/>
		        <variable editable="true" name="vacc_lat_imm" value="7" minval="1"/>
		        <variable editable="true" name="vacc_efficacy" value="0.75" minval="0" maxval="1"/>
		        <variable editable="false" name="gamma" value="(vacc_rate/vacc_lat_imm)*vacc_efficacy"/>
		        <variable editable="true" name="R0" value="1.4" minval="1.3" maxval="2.1"/>
		        <variable editable="true" name="epsilon" value="1/1.5" minval="0.5" maxval="2.5"/>
		        <variable editable="true" name="mu" value="1/2.0" minval="0.5" maxval="2.5"/>
		        <variable editable="false" name="beta" value="R0*mu"/>
		        <variable editable="true" name="sympt_prob" value="0.3" minval="0" maxval="1"/>
		        <variable editable="true" name="av_eff" value="0.6" minval="0" maxval="1"/>
		        <variable editable="true" name="av_prob" value="0.05" minval="0" maxval="1"/>
		        <variable editable="false" name="pavt" value="av_eff*av_prob"/>
		        <variable editable="false" name="mu_av" value="1"/>
		        <variable editable="false" name="ups" value="1-sympt_prob"/>
		        <variable editable="false" name="upa" value="1-pavt"/>
		      </variables>
		    </compartmentalModel>
		    <parameters outbreakSize="2" secondaryEvents="1" commutingRate="8" seasonalityEnabled="false" runCount="5" seasonalityAlphaMin="0.60" duration="365" commutingModel="gravity" startDate="2017-01-10" occupancyRate="100" flightsTimeAggregation="month"/>
		    <notes/>
		    <initialCompartments>
		      <initialCompartment compartment="Susceptible" fraction="100"/>
		    </initialCompartments>
		    <seeds>
		      <seed compartment="Infectious" city="355" number="20"/>
		    </seeds>
		    <resultCompartments>
		      <id>Vaccinated</id>
		      <id>Infectious</id>
		      <id>Asymptomatic</id>
		      <id>Infectious_sympt_AV</id>
		    </resultCompartments>
		    <exceptions>
		      <exception hemispheres="" continents="" from="2017-01-10" till="2017-10-10" regions="" countries="" basins="">
		        <variable value="0.0" name="vacc_rate"/>
		      </exception>
		      <exception hemispheres="" continents="" from="2017-01-10" till="2017-06-10" regions="" countries="" basins="">
		        <variable value="0.0" name="av_prob"/>
		      </exception>
		      <exception hemispheres="" continents="" from="2017-10-10" till="2018-01-10" regions="" countries="" basins="">
		        <variable value="0.0" name="av_prob"/>
		      </exception>
		    </exceptions>
		    <abmParameters>
		      <variable description="School closure: starting day">
		        <integer name="school_closure_start" minval="0" maxval="365">264</integer>
		      </variable>
		      <variable description="School closure: end day">
		        <integer name="school_closure_end" minval="0" maxval="365">295</integer>
		      </variable>
		      <variable description="Antiviral treatment: start day">
		        <integer name="antiviral_start" minval="0" maxval="365">151</integer>
		      </variable>
		      <variable description="Antiviral treatment: end day">
		        <integer name="antiviral_end" minval="0" maxval="365">273</integer>
		      </variable>
		      <variable description="Maximum number of antiviral doses available">
		        <integer name="antiviral_max_doses" minval="0">5000000</integer>
		      </variable>
		      <variable description="Vaccination campaign: start day">
		        <integer name="vacc_start" minval="0" maxval="365">273</integer>
		      </variable>
		      <variable description="Vaccination campaign: end day">
		        <integer name="vacc_end" minval="0" maxval="365">365</integer>
		      </variable>
		      <variable description="Maximum number of vaccine doses available">
		        <integer name="vacc_max_doses" minval="0">2000000</integer>
		      </variable>
		    </abmParameters>
		    <abmOutputData>
		      <value key="not_at_school" name="Not at school" desc="Number of individuals per 1000 who stayed home from school" position="1"/>
		      <value key="antiviral_doses" name="Given antivirals" desc="Number of individuals per 1000 who were given antivirals" position="2"/>
		      <value key="vaccine_doses" name="Vaccinated" desc="Number of individuals per 1000 being vaccinated" position="3"/>
		    </abmOutputData>
		  </definition>
		  <metadata>
		    <creationDate>2017-01-10T12:37:05</creationDate>
		    <clientVersion>6.7</clientVersion>
		  </metadata>
		  <extradata>
		    <abmVariableOrder>school_closure_start school_closure_end antiviral_start antiviral_end antiviral_max_doses vacc_start vacc_end vacc_max_doses</abmVariableOrder>
		    <userVariableOrder>vacc_rate vacc_efficacy vacc_lat_imm gamma R0 epsilon mu mu_iso beta beta_iso sympt_prob ups iso_prob upi</userVariableOrder>
		  </extradata>
		</simulation>
`
});


abm_isifbk_Connector.templatesDFKI.push({
	name: "FLU ABM with interventions; Italy (dfki mobility data)",
	simulation: `
	<simulation xmlns="http://www.gleamviz.org/xmlns/gleamviz_v4_0">
	  <definition name="FLU ABM with interventions; Italy (dfki mobility data)" sim_type="ABM" abm_id="FBK-IT-DFKI" id="1479222222224.XYZ" type="multi-run">
	    <compartmentalModel>
	      <compartments>
	        <compartment id="Susceptible" color="#00c18d" x="323" y="52" isSecondary="false" isCommuter="true" isCarrier="false" isTraveller="true"/>
	        <compartment id="Exposed" color="#f4ce17" x="323" y="234" isSecondary="false" isCommuter="true" isCarrier="true" isTraveller="true"/>
	        <compartment id="Infectious" color="#ff5127" x="391" y="433" isSecondary="true" isCommuter="true" isCarrier="true" isTraveller="false"/>
	        <compartment id="Asymptomatic" color="#f59123" x="716" y="382" isSecondary="false" isCommuter="true" isCarrier="true" isTraveller="true"/>
	        <compartment id="Infectious_sympt_AV" color="#ff5127" x="17" y="425" isSecondary="true" isCommuter="false" isCarrier="true" isTraveller="false"/>
	        <compartment id="Recovered" color="#89c443" x="335" y="616" isSecondary="false" isCommuter="true" isCarrier="false" isTraveller="true"/>
	        <compartment id="Vaccinated" color="#51b2b7" x="49" y="180" isSecondary="false" isCommuter="true" isCarrier="false" isTraveller="true"/>
	      </compartments>
	      <ratioTransitions>
	        <ratioTransition source="Susceptible" ratio="gamma" labelPosition="0.5" target="Vaccinated"/>
	        <ratioTransition source="Exposed" ratio="epsilon*sympt_prob*upa" labelPosition="0.5" target="Infectious"/>
	        <ratioTransition source="Exposed" ratio="epsilon*ups" labelPosition="0.5" target="Asymptomatic"/>
	        <ratioTransition source="Infectious" ratio="mu" labelPosition="0.5" target="Recovered"/>
	        <ratioTransition source="Asymptomatic" ratio="mu" labelPosition="0.5" target="Recovered"/>
	        <ratioTransition source="Exposed" ratio="epsilon*sympt_prob*pavt" labelPosition="0.5" target="Infectious_sympt_AV"/>
	        <ratioTransition source="Infectious_sympt_AV" ratio="mu_av" labelPosition="0.5" target="Recovered"/>
	      </ratioTransitions>
	      <infections>
	        <infection source="Susceptible" target="Exposed">
	          <infector source="Infectious" ratio="beta" x="179" y="-27"/>
	          <infector source="Asymptomatic" ratio="beta" x="179" y="12"/>
	        </infection>
	      </infections>
	      <variables>
	        <variable editable="true" name="vacc_rate" value="0.01" minval="0" maxval="1"/>
	        <variable editable="true" name="vacc_lat_imm" value="7" minval="1"/>
	        <variable editable="true" name="vacc_efficacy" value="0.75" minval="0" maxval="1"/>
	        <variable editable="false" name="gamma" value="(vacc_rate/vacc_lat_imm)*vacc_efficacy"/>
	        <variable editable="true" name="R0" value="1.4" minval="1.3" maxval="2.1"/>
	        <variable editable="true" name="epsilon" value="1/1.5" minval="0.5" maxval="2.5"/>
	        <variable editable="true" name="mu" value="1/2.0" minval="0.5" maxval="2.5"/>
	        <variable editable="false" name="beta" value="R0*mu"/>
	        <variable editable="true" name="sympt_prob" value="0.3" minval="0" maxval="1"/>
	        <variable editable="true" name="av_eff" value="0.6" minval="0" maxval="1"/>
	        <variable editable="true" name="av_prob" value="0.05" minval="0" maxval="1"/>
	        <variable editable="false" name="pavt" value="av_eff*av_prob"/>
	        <variable editable="false" name="mu_av" value="1"/>
	        <variable editable="false" name="ups" value="1-sympt_prob"/>
	        <variable editable="false" name="upa" value="1-pavt"/>
	      </variables>
	    </compartmentalModel>
	    <parameters outbreakSize="2" secondaryEvents="1" commutingRate="8" seasonalityEnabled="true" runCount="5" seasonalityAlphaMin="0.60" duration="365" commutingModel="gravity" startDate="2017-01-10" occupancyRate="100" flightsTimeAggregation="month"/>
	    <notes/>
	    <initialCompartments>
	      <initialCompartment compartment="Susceptible" fraction="100"/>
	    </initialCompartments>
	    <seeds>
	      <seed compartment="Infectious" city="355" number="20"/>
	    </seeds>
	    <resultCompartments>
	      <id>Vaccinated</id>
	      <id>Infectious</id>
	      <id>Asymptomatic</id>
	      <id>Infectious_sympt_AV</id>
	    </resultCompartments>
	    <exceptions>
	      <exception hemispheres="" continents="" from="2017-01-10" till="2017-10-10" regions="" countries="" basins="">
	        <variable value="0.0" name="vacc_rate"/>
	      </exception>
	      <exception hemispheres="" continents="" from="2017-01-10" till="2017-06-10" regions="" countries="" basins="">
	        <variable value="0.0" name="av_prob"/>
	      </exception>
	      <exception hemispheres="" continents="" from="2017-10-10" till="2018-01-10" regions="" countries="" basins="">
	        <variable value="0.0" name="av_prob"/>
	      </exception>
	    </exceptions>
	    <abmParameters>
	      <variable description="School closure: starting day">
	        <integer name="school_closure_start" minval="0" maxval="365">264</integer>
	      </variable>
	      <variable description="School closure: end day">
	        <integer name="school_closure_end" minval="0" maxval="365">295</integer>
	      </variable>
	      <variable description="Antiviral treatment: start day">
	        <integer name="antiviral_start" minval="0" maxval="365">151</integer>
	      </variable>
	      <variable description="Antiviral treatment: end day">
	        <integer name="antiviral_end" minval="0" maxval="365">273</integer>
	      </variable>
	      <variable description="Maximum number of antiviral doses available">
	        <integer name="antiviral_max_doses" minval="0">5000000</integer>
	      </variable>
	      <variable description="Vaccination campaign: start day">
	        <integer name="vacc_start" minval="0" maxval="365">273</integer>
	      </variable>
	      <variable description="Vaccination campaign: end day">
	        <integer name="vacc_end" minval="0" maxval="365">365</integer>
	      </variable>
	      <variable description="Maximum number of vaccine doses available">
	        <integer name="vacc_max_doses" minval="0">2000000</integer>
	      </variable>
	    </abmParameters>
	    <abmOutputData>
	      <value key="not_at_school" name="Not at school" desc="Number of individuals per 1000 who stayed home from school" position="1"/>
	      <value key="antiviral_doses" name="Given antivirals" desc="Number of individuals per 1000 who were given antivirals" position="2"/>
	      <value key="vaccine_doses" name="Vaccinated" desc="Number of individuals per 1000 being vaccinated" position="3"/>
	    </abmOutputData>
	  </definition>
	  <metadata>
	    <creationDate>2017-01-10T12:37:05</creationDate>
	    <clientVersion>6.7</clientVersion>
	  </metadata>
	  <extradata>
	    <abmVariableOrder>school_closure_start school_closure_end antiviral_start antiviral_end antiviral_max_doses vacc_start vacc_end vacc_max_doses</abmVariableOrder>
	    <userVariableOrder>vacc_rate vacc_efficacy vacc_lat_imm gamma R0 epsilon mu mu_iso beta beta_iso sympt_prob ups iso_prob upi</userVariableOrder>
	  </extradata>
	</simulation>
	`
});
