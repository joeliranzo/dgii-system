import { Injectable } from '@nestjs/common';
import * as forge from 'node-forge';
import * as crypto from 'crypto';

@Injectable()
export class SignerService {
  readP12Certificate(p12Buffer: Buffer, password: string) {
    try {
      const p12Der = forge.util.decode64(p12Buffer.toString('base64'));
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
      const privateKey = keyBag?.[0]?.key;

      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag];
      const certificate = certBag?.[0]?.cert;

      if (!privateKey || !certificate) {
        throw new Error('No se pudo extraer la clave privada o el certificado del archivo .p12');
      }

      return {
        privateKey,
        certificate,
        privateKeyPem: forge.pki.privateKeyToPem(privateKey),
        certificatePem: forge.pki.certificateToPem(certificate),
        certificateDer: forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes(),
        subject: certificate.subject.getField('CN')?.value || '',
        issuer: certificate.issuer.getField('CN')?.value || '',
        validFrom: certificate.validity.notBefore,
        validTo: certificate.validity.notAfter,
      };
    } catch (err: any) {
      throw new Error(`Error leyendo certificado .p12: ${err.message}`);
    }
  }

  signXml(xmlContent: string, privateKeyPem: string, certificateDerBase64: string): string {
    try {
      const xmlBuffer = Buffer.from(xmlContent, 'utf-8');
      const digest = crypto.createHash('sha256').update(xmlBuffer).digest('base64');

      const sign = crypto.createSign('RSA-SHA256');
      sign.update(xmlContent);
      const signatureValue = sign.sign(privateKeyPem, 'base64');

      return xmlContent.replace(
        '</ECF>',
        `  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <Reference URI="">
        <Transforms>
          <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        </Transforms>
        <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <DigestValue>${digest}</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>${signatureValue}</SignatureValue>
    <KeyInfo>
      <X509Data>
        <X509Certificate>${certificateDerBase64}</X509Certificate>
      </X509Data>
    </KeyInfo>
  </Signature>
</ECF>`,
      );
    } catch (err: any) {
      throw new Error(`Error firmando XML: ${err.message}`);
    }
  }

  signXmlDemo(xmlContent: string): string {
    const digest = crypto.createHash('sha256').update(xmlContent).digest('base64');
    const demoSignature = crypto.randomBytes(256).toString('base64');

    return xmlContent.replace(
      '</ECF>',
      `  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <Reference URI="">
        <Transforms>
          <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        </Transforms>
        <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <DigestValue>${digest}</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>${demoSignature}</SignatureValue>
    <KeyInfo>
      <X509Data>
        <X509Certificate>DEMO_CERTIFICATE</X509Certificate>
      </X509Data>
    </KeyInfo>
  </Signature>
</ECF>`,
    );
  }
}
