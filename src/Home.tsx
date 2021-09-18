import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";

import * as anchor from "@project-serum/anchor";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import { makeStyles } from '@material-ui/core/styles';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import TwitterIcon from '@material-ui/icons/Twitter';

import Discord from './discord_logo.png';

import movie from './movie.gif'
import background_img from './stars1.gif'

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
} from "./candy-machine";

const ConnectButton = styled(WalletDialogButton)``;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)``; // add your styles here

const useStyles = makeStyles((theme) => ({
  root: {
    width: '50%',
  },
  heading: {
    fontSize: theme.typography.pxToRem(24),
    fontWeight: theme.typography.fontWeightRegular,
    color: 'gray'
  },
  expandedPanel: {
    color: 'gray',
    backgroundColor: 'gray',
    background: 'gray'
  }

}));

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT
  const [itemsRemaining, setItemsRemaining] = useState(0);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet?.publicKey) {
        const balance = await props.connection.getBalance(wallet?.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet?.publicKey) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(() => {
    (async () => {
      if (
        !wallet ||
        !wallet.publicKey ||
        !wallet.signAllTransactions ||
        !wallet.signTransaction
      ) {
        return;
      }

      const anchorWallet = {
        publicKey: wallet.publicKey,
        signAllTransactions: wallet.signAllTransactions,
        signTransaction: wallet.signTransaction,
      } as anchor.Wallet;

      const { candyMachine, goLiveDate, itemsRemaining } =
        await getCandyMachineState(
          anchorWallet,
          props.candyMachineId,
          props.connection
        );

      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
    })();
  }, [wallet, props.candyMachineId, props.connection]);

  const classes = useStyles();

  return (
    <main>
      <div style={{ backgroundImage: `url(${background_img})` }}>
      
      <div className="App">
        <header className="App-header">
          <h1>
            Haikana
          </h1>
          <div className="header-text">
            The first generative Haikus on Solana!
          </div>
          <div className="wallet-info">


            {wallet.connected && (
              <p>Address: {shortenAddress(wallet.publicKey?.toBase58() || "")}</p>
            )}

            {wallet.connected && (
              <p>Balance: {(balance || 0).toLocaleString()} SOL</p>
            )}

            <div className="mint-container">
              <MintContainer>
                {!wallet.connected ? (
                  <ConnectButton>Connect Wallet</ConnectButton>
                ) : (
                  <div>
                    <MintButton
                      disabled={isSoldOut || isMinting || !isActive}
                      onClick={onMint}
                      variant="contained"
                    >
                      {isSoldOut ? (
                        "SOLD OUT"
                      ) : isActive ? (
                        isMinting ? (
                          <CircularProgress />
                        ) : (
                          "MINT"
                        )
                      ) : (
                        <div className="countdown">
                          <Countdown
                            date={startDate}
                            onMount={({ completed }) => completed && setIsActive(true)}
                            onComplete={() => setIsActive(true)}
                            renderer={renderCounter}
                          />
                        </div>
                      )}
                    </MintButton>
                    {isActive? (
                      <div className="items-remaining">{itemsRemaining} / 245 Available</div>
                    ) : (
                      ""
                    )}
                    
                    <div className="countdown">
                          <Countdown
                            date={startDate}
                            onMount={({ completed }) => completed && setIsActive(true)}
                            onComplete={() => setIsActive(true)}
                            renderer={renderCounter}
                          />
                        </div>
                  </div>
                )}
              </MintContainer>
            </div>
            &nbsp;   
          </div>

          <div>    &nbsp;   
          <img src={movie} alt="Haiku Flipbook"/>  
          </div>


          <Snackbar
            open={alertState.open}
            autoHideDuration={6000}
            onClose={() => setAlertState({ ...alertState, open: false })}
          >
            <Alert
              onClose={() => setAlertState({ ...alertState, open: false })}
              severity={alertState.severity}
            >
              {alertState.message}
            </Alert>
          </Snackbar>

          {/* <div className="accordians"> */}
          <div className={classes.root} id="accordian">
          &nbsp; 
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1a-content"
            id="panel1a-header"
          >
            <div className="accordian-heading" style={{fontSize:"26px", color:'black'}}><b>FAQ</b></div>
          </AccordionSummary>
          <AccordionDetails>
          <div className="faq-page">
            <div className="question-text">
              <div className="questions-text" style={{fontSize:"24px", color:'blue'}}><b>What is Haikana?</b></div>
              <div className="answers-text">
                Haikana is a collection of algorthmically generated Haikus.
              </div>
              <div className="questions-text" style={{fontSize:"24px", color:'blue'}}><b>How are the Haikus generated?</b></div>
              <div className="answers-text">
                The Haikus are created using a generative process.
                For this collection, the algorithm that creates them is trained on a specific text.
                The first person to tweet @realHaikana the text that was used will get a surprise ;). 
              </div>
              <div className="questions-text" style={{fontSize:"24px", color:'blue'}}><b>How much is a Haiku?</b></div>
              <div className="answers-text">
                0.5 SOL.
              </div>
              <div className="questions-text" style={{fontSize:"24px", color:'blue'}}><b>How many Haikus are there?</b></div>
              <div className="answers-text">
                There are 250 unique Haikus. 5 have been pre-minted, 3 of which will be used for giveaways.
              </div>
              <div className="questions-text" style={{fontSize:"24px", color:'blue'}}><b>Will there be more drops?</b></div>
              <div className="answers-text">
                Haikus will be used as a DAO token.
                Haiku holders will vote on whether to mint further collections.
                If a vote to mint a new collection is passed, holders will be able to vote on the text
                to be used for the new collection and on the supply of the new collection.
              </div>
            </div>
          </div>
          </AccordionDetails>
        </Accordion>
        {/* </div> */}
      </div>
      &nbsp; 
        <div className="social">
              <a
                className="App-link"
                href="http://twitter.com/realHaikana"
                target="_blank"
                rel="noopener noreferrer"
              >
                <TwitterIcon style={{ fontSize: '40px'}} />
              </a> 
              {/*
                <a
                className="App-link"
                href=""
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={Discord}
                alt="Discord" 
                style={{
                  width:'40px', 
                  height:'40px',
                  margin: 'auto',
                  verticalAlign: 'top'
                  }}/>
              </a>
                */}
            </div>
        </header>
      </div>
      </div>
    </main>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {days} days, {hours} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

export default Home;
