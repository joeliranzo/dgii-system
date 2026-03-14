/**
 * DGII API Client
 * Handles authentication, e-CF submission, and status tracking
 * Reference: https://ecf.dgii.gov.do/testecf/
 */
import axios from 'axios';

const ENVIRONMENTS = {
  TesteCF: {
    auth: 'https://ecf.dgii.gov.do/testecf/autenticacion',
    reception: 'https://ecf.dgii.gov.do/testecf/recepcion',
    tracking: 'https://ecf.dgii.gov.do/testecf/consultaresultado'
  },
  Produccion: {
    auth: 'https://ecf.dgii.gov.do/ecf/autenticacion',
    reception: 'https://ecf.dgii.gov.do/ecf/recepcion',
    tracking: 'https://ecf.dgii.gov.do/ecf/consultaresultado'
  }
};

export class DgiiApiClient {
  constructor(environment = 'TesteCF') {
    this.env = ENVIRONMENTS[environment] || ENVIRONMENTS.TesteCF;
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Step 1: Get authentication seed from DGII
   */
  async getSeed() {
    try {
      const response = await axios.get(`${this.env.auth}/api/Autenticacion/Semilla`, {
        headers: { 'Accept': 'application/xml' },
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error obteniendo semilla DGII: ${error.message}`);
    }
  }

  /**
   * Step 2: Submit signed seed to get auth token
   */
  async authenticate(signedSeedXml) {
    try {
      const response = await axios.post(
        `${this.env.auth}/api/Autenticacion/ValidarSemilla`,
        signedSeedXml,
        {
          headers: {
            'Content-Type': 'application/xml',
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      this.token = response.data.token || response.data;
      this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
      return this.token;
    } catch (error) {
      throw new Error(`Error autenticando con DGII: ${error.message}`);
    }
  }

  /**
   * Step 3: Send signed e-CF to DGII
   */
  async sendEcf(signedEcfXml, rncEmisor, encf) {
    if (!this.token) {
      throw new Error('No autenticado. Debe autenticarse primero con la DGII.');
    }

    try {
      const response = await axios.post(
        `${this.env.reception}/api/Recepcion/FacturasElectronicas`,
        signedEcfXml,
        {
          headers: {
            'Content-Type': 'application/xml',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          timeout: 60000
        }
      );

      return {
        success: true,
        trackId: response.data.trackId || response.data.TrackId,
        message: response.data.mensaje || response.data.Message || 'e-CF recibido exitosamente',
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        trackId: null,
        message: error.response?.data?.mensaje || error.response?.data?.Message || error.message,
        data: error.response?.data
      };
    }
  }

  /**
   * Step 4: Check status of submitted e-CF
   */
  async checkStatus(trackId) {
    if (!this.token) {
      throw new Error('No autenticado. Debe autenticarse primero con la DGII.');
    }

    try {
      const response = await axios.get(
        `${this.env.tracking}/api/ConsultaResultado/${trackId}`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          timeout: 30000
        }
      );

      return {
        success: true,
        status: response.data.estado || response.data.Status,
        message: response.data.mensaje || response.data.Message,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        status: 'error',
        message: error.response?.data?.mensaje || error.message,
        data: error.response?.data
      };
    }
  }

  /**
   * Simulated flow for demo/development
   */
  async simulateSend(encf) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const trackId = `TRK-${Date.now()}-${encf}`;
    return {
      success: true,
      trackId,
      message: '[SIMULADO] e-CF recibido exitosamente en entorno de desarrollo',
      simulated: true
    };
  }

  async simulateCheck(trackId) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const statuses = ['Aceptado', 'Aceptado Condicional', 'Rechazado'];
    const randomStatus = statuses[Math.floor(Math.random() * 2)]; // mostly accepted
    return {
      success: true,
      status: randomStatus,
      message: `[SIMULADO] Estado: ${randomStatus}`,
      simulated: true
    };
  }

  isAuthenticated() {
    return this.token && this.tokenExpiry && new Date() < this.tokenExpiry;
  }
}
