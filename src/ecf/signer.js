/**
 * Digital Signature module for e-CF
 * Signs XML documents with a .p12 certificate using XML Digital Signature
 */
import forge from 'node-forge';
import crypto from 'crypto';

/**
 * Read a .p12 certificate file
 */
export function readP12Certificate(p12Buffer, password) {
  try {
    const p12Der = forge.util.decode64(p12Buffer.toString('base64'));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // Extract private key
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
    const privateKey = keyBag?.[0]?.key;

    // Extract certificate
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
      validTo: certificate.validity.notAfter
    };
  } catch (err) {
    throw new Error(`Error leyendo certificado .p12: ${err.message}`);
  }
}

/**
 * Sign XML content using XML Digital Signature (enveloped)
 */
export function signXml(xmlContent, privateKeyPem, certificateDerBase64) {
  try {
    // Canonicalize and compute digest
    const xmlBuffer = Buffer.from(xmlContent, 'utf-8');
    const digest = crypto.createHash('sha256').update(xmlBuffer).digest('base64');

    // Create signature value
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(xmlContent);
    const signatureValue = sign.sign(privateKeyPem, 'base64');

    // Build signed info XML
    const signedXml = xmlContent.replace(
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
</ECF>`
    );

    return signedXml;
  } catch (err) {
    throw new Error(`Error firmando XML: ${err.message}`);
  }
}

/**
 * Generate a demo/test signature (for development without real certificate)
 */
export function signXmlDemo(xmlContent) {
  const digest = crypto.createHash('sha256').update(xmlContent).digest('base64');
  const demoSignature = crypto.randomBytes(256).toString('base64');

  const signedXml = xmlContent.replace(
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
</ECF>`
  );

  return signedXml;
}
